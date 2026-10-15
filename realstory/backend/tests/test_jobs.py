import json
from decimal import Decimal
from unittest import mock

import pytest

from apps.jobs import services
from apps.jobs.models import Job

pytestmark = pytest.mark.django_db
S = Job.Status


def create(api, project, kind, **extra):
    r = api.post("/api/jobs/", {"project": project.pk, "kind": kind, **extra}, format="json")
    assert r.status_code == 201, r.data
    return r.data


def test_free_job_runs_to_completion(api, project, fake_kinds, run_on_commit):
    with run_on_commit():
        job = create(api, project, "test_free")
    assert job["status"] == "pending"  # response is built before the worker runs
    j = Job.objects.get(pk=job["id"])
    assert j.status == S.COMPLETED
    assert j.result == {"ok": True}
    assert j.attempts == 1
    assert fake_kinds == [j.pk]


def test_unknown_kind_rejected(api, project):
    r = api.post("/api/jobs/", {"project": project.pk, "kind": "nope"}, format="json")
    assert r.status_code == 400
    assert "kind" in r.data


def test_client_cannot_mark_job_as_free(api, project, fake_kinds, run_on_commit):
    with run_on_commit():
        job = create(api, project, "test_paid", is_paid=False, status="pending")
    assert job["is_paid"] is True
    assert job["status"] == "needs_approval"
    assert fake_kinds == []


def test_paid_job_waits_for_approval_then_runs(api, project, fake_kinds, run_on_commit):
    job = create(api, project, "test_paid")
    assert job["estimated_cost"] == "4.0000"
    assert fake_kinds == []

    with run_on_commit():
        r = api.post(f"/api/jobs/{job['id']}/approve/")
    assert r.status_code == 200, r.data
    j = Job.objects.get(pk=job["id"])
    assert j.status == S.COMPLETED
    assert j.approved_at is not None
    assert fake_kinds == [j.pk]


def test_approval_respects_budget(api, project, fake_kinds, run_on_commit):
    first = create(api, project, "test_paid", params={"cost": "6"})
    second = create(api, project, "test_paid", params={"cost": "5"})
    with run_on_commit():
        assert api.post(f"/api/jobs/{first['id']}/approve/").status_code == 200
    r = api.post(f"/api/jobs/{second['id']}/approve/")
    assert r.status_code == 400
    assert "budget" in r.data["detail"]
    assert Job.objects.get(pk=second["id"]).status == S.NEEDS_APPROVAL
    assert services.committed_cost(project) == Decimal("6")


def test_approval_needs_budget_and_estimate(api, project, fake_kinds):
    unknown = create(api, project, "test_paid_unknown")
    r = api.post(f"/api/jobs/{unknown['id']}/approve/")
    assert r.status_code == 400 and "inconnu" in r.data["detail"]

    project.budget_limit = None
    project.save()
    paid = create(api, project, "test_paid")
    r = api.post(f"/api/jobs/{paid['id']}/approve/")
    assert r.status_code == 400 and "Aucun budget" in r.data["detail"]


def test_reject(api, project, fake_kinds):
    job = create(api, project, "test_paid")
    r = api.post(f"/api/jobs/{job['id']}/reject/")
    assert r.data["status"] == "failed"
    assert r.data["error"] == "Refusée par l'utilisateur."
    assert api.post(f"/api/jobs/{job['id']}/approve/").status_code == 400


def test_failure_is_recorded_and_can_be_retried(api, project, fake_kinds, run_on_commit):
    with run_on_commit():
        job = create(api, project, "test_fail")
    j = Job.objects.get(pk=job["id"])
    assert j.status == S.FAILED
    assert j.error == "Service indisponible"

    j.kind = "test_free"  # simulate the external service coming back
    j.save()
    with run_on_commit():
        r = api.post(f"/api/jobs/{j.pk}/retry/")
    assert r.status_code == 200
    j.refresh_from_db()
    assert j.status == S.COMPLETED and j.error == "" and j.attempts == 2


def test_paid_retry_requires_new_approval(api, project, fake_kinds, run_on_commit):
    job = create(api, project, "test_paid")
    api.post(f"/api/jobs/{job['id']}/reject/")
    r = api.post(f"/api/jobs/{job['id']}/retry/")
    assert r.data["status"] == "needs_approval"
    assert r.data["approved_at"] is None
    assert fake_kinds == []


def test_only_failed_jobs_can_be_retried(api, project, fake_kinds):
    job = create(api, project, "test_paid")
    assert api.post(f"/api/jobs/{job['id']}/retry/").status_code == 400


def test_worker_refuses_unapproved_paid_job(project, fake_kinds):
    job = services.create_job(project, "test_paid")
    Job.objects.filter(pk=job.pk).update(status=S.PENDING)  # bypass approval
    services.execute(job.pk)
    assert Job.objects.get(pk=job.pk).status == S.PENDING
    assert fake_kinds == []


def test_broker_down_marks_job_failed(api, project, fake_kinds, run_on_commit):
    with mock.patch("apps.jobs.tasks.run_job.delay", side_effect=ConnectionError("refused")):
        with run_on_commit():
            job = create(api, project, "test_free")
    j = Job.objects.get(pk=job["id"])
    assert j.status == S.FAILED
    assert "File de tâches indisponible" in j.error


def test_cannot_delete_running_job(api, project, fake_kinds):
    job = create(api, project, "test_paid")
    Job.objects.filter(pk=job["id"]).update(status=S.RUNNING)
    assert api.delete(f"/api/jobs/{job['id']}/").status_code == 400


def test_job_filters_and_kinds(api, project, fake_kinds):
    create(api, project, "test_paid")
    assert api.get(f"/api/jobs/?project={project.pk}&status=needs_approval").data["count"] == 1
    assert api.get("/api/jobs/?status=completed").data["count"] == 0
    keys = {k["key"]: k["is_paid"] for k in api.get("/api/job-kinds/").data}
    assert keys["project_snapshot"] is False
    assert keys["test_paid"] is True


def test_project_snapshot_writes_backup(api, project, settings, run_on_commit):
    with run_on_commit():
        job = create(api, project, "project_snapshot")
    j = Job.objects.get(pk=job["id"])
    assert j.status == S.COMPLETED, j.error
    path = settings.MEDIA_ROOT / j.result["file"]
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["format"] == "realstory-snapshot"
    assert data["project"]["title"] == "La traversée"
    assert j.result["file"].startswith(f"projects/{project.pk}/snapshots/")
