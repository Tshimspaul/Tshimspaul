from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.jobs import registry
from apps.projects.models import Project
from config.celery import app as celery_app


@pytest.fixture(autouse=True)
def _isolated(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / "media"
    settings.CELERY_TASK_ALWAYS_EAGER = True
    celery_app.conf.task_always_eager = True
    celery_app.conf.task_eager_propagates = True


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def project(db):
    return Project.objects.create(title="La traversée", budget_limit=Decimal("10.00"))


@pytest.fixture
def run_on_commit(django_capture_on_commit_callbacks):
    """Execute on_commit callbacks (job enqueueing) inside the test transaction."""
    return lambda: django_capture_on_commit_callbacks(execute=True)


@pytest.fixture
def fake_kinds():
    """Register a free and a paid test-only job kind."""
    calls = []

    def ok(job):
        calls.append(job.pk)
        return {"ok": True}

    def boom(job):
        raise RuntimeError("Service indisponible")

    registry.register(registry.JobKind("test_free", "Gratuite", ok))
    registry.register(registry.JobKind("test_fail", "Échoue", boom))
    registry.register(
        registry.JobKind("test_paid", "Payante", ok, is_paid=True, estimate_cost=lambda p: Decimal(p.get("cost", "4")))
    )
    registry.register(registry.JobKind("test_paid_unknown", "Payante sans estimation", ok, is_paid=True))
    yield calls
    for key in ("test_free", "test_fail", "test_paid", "test_paid_unknown"):
        registry.unregister(key)
