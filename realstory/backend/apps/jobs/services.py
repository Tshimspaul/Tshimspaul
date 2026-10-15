"""Job lifecycle: creation, approval, execution and retry.

Allowed transitions:
    (create, free)  -> PENDING
    (create, paid)  -> NEEDS_APPROVAL
    NEEDS_APPROVAL  -> PENDING    (approve, within budget)
    NEEDS_APPROVAL  -> FAILED     (reject)
    PENDING         -> RUNNING    (worker picks it up)
    RUNNING         -> COMPLETED | FAILED
    FAILED          -> PENDING (free) | NEEDS_APPROVAL (paid)   (retry)
"""

import logging
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from .models import Job
from .registry import get_kind

logger = logging.getLogger(__name__)

S = Job.Status


class TransitionError(Exception):
    pass


class BudgetExceeded(TransitionError):
    pass


def committed_cost(project) -> Decimal:
    """Cost already approved, running or spent for a project."""
    total = (
        Job.objects.filter(
            project=project,
            is_paid=True,
            status__in=[S.PENDING, S.RUNNING, S.COMPLETED],
        )
        .annotate(cost=Coalesce("actual_cost", "estimated_cost"))
        .aggregate(total=Sum("cost"))["total"]
    )
    return total or Decimal("0")


def _enqueue(job: Job) -> None:
    from .tasks import run_job

    def send():
        try:
            run_job.delay(job.pk)
        except Exception as exc:  # broker unreachable, etc.
            logger.exception("Could not enqueue job %s", job.pk)
            Job.objects.filter(pk=job.pk, status=S.PENDING).update(
                status=S.FAILED,
                error=f"File de tâches indisponible (Redis / Celery démarrés ?) : {exc}",
                finished_at=timezone.now(),
            )

    transaction.on_commit(send)


def create_job(project, kind_key: str, params: dict | None = None, label: str = "") -> Job:
    kind = get_kind(kind_key)
    params = params or {}
    estimate = kind.estimate_cost(params) if kind.estimate_cost else None
    with transaction.atomic():
        job = Job.objects.create(
            project=project,
            kind=kind.key,
            label=label or kind.label,
            is_paid=kind.is_paid,
            estimated_cost=estimate,
            params=params,
            status=S.NEEDS_APPROVAL if kind.is_paid else S.PENDING,
        )
        if not kind.is_paid:
            _enqueue(job)
    return job


def approve(job: Job) -> Job:
    from apps.projects.models import Project

    with transaction.atomic():
        job = Job.objects.select_for_update().get(pk=job.pk)
        if job.status != S.NEEDS_APPROVAL:
            raise TransitionError("Seule une tâche en « Validation nécessaire » peut être approuvée.")
        project = Project.objects.select_for_update().get(pk=job.project_id)
        if job.estimated_cost is None:
            raise BudgetExceeded("Coût estimé inconnu : impossible de vérifier le budget.")
        if project.budget_limit is None:
            raise BudgetExceeded("Aucun budget n'est défini pour ce projet.")
        if committed_cost(project) + job.estimated_cost > project.budget_limit:
            raise BudgetExceeded("Cette tâche dépasserait le budget maximum du projet.")
        job.status = S.PENDING
        job.approved_at = timezone.now()
        job.save(update_fields=["status", "approved_at", "updated_at"])
        _enqueue(job)
    return job


def reject(job: Job) -> Job:
    with transaction.atomic():
        job = Job.objects.select_for_update().get(pk=job.pk)
        if job.status != S.NEEDS_APPROVAL:
            raise TransitionError("Seule une tâche en « Validation nécessaire » peut être refusée.")
        job.status = S.FAILED
        job.error = "Refusée par l'utilisateur."
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "error", "finished_at", "updated_at"])
    return job


def retry(job: Job) -> Job:
    with transaction.atomic():
        job = Job.objects.select_for_update().get(pk=job.pk)
        if job.status != S.FAILED:
            raise TransitionError("Seule une tâche en échec peut être relancée.")
        job.error = ""
        job.finished_at = None
        job.approved_at = None
        # A paid retry costs money again, so it needs a new approval.
        job.status = S.NEEDS_APPROVAL if job.is_paid else S.PENDING
        job.save(update_fields=["status", "error", "finished_at", "approved_at", "updated_at"])
        if not job.is_paid:
            _enqueue(job)
    return job


def execute(job_id: int) -> None:
    """Run a job's handler. Called by the Celery worker."""
    with transaction.atomic():
        job = Job.objects.select_for_update().filter(pk=job_id).first()
        if job is None:
            logger.warning("Job %s no longer exists", job_id)
            return
        if job.status != S.PENDING or (job.is_paid and job.approved_at is None):
            logger.warning("Job %s not runnable (status=%s)", job_id, job.status)
            return
        job.status = S.RUNNING
        job.attempts += 1
        job.started_at = timezone.now()
        job.save(update_fields=["status", "attempts", "started_at", "updated_at"])

    try:
        result = get_kind(job.kind).handler(job) or {}
    except Exception as exc:
        logger.exception("Job %s (%s) failed", job.pk, job.kind)
        job.status = S.FAILED
        job.error = str(exc) or exc.__class__.__name__
    else:
        job.status = S.COMPLETED
        job.result = result
        job.error = ""
    job.finished_at = timezone.now()
    job.save(update_fields=["status", "result", "error", "finished_at", "updated_at"])
