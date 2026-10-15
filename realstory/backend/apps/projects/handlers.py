"""Job handlers owned by the projects app."""

import json

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone

from apps.jobs.registry import JobKind, register


def snapshot_project(job):
    """Write a JSON backup of the project and its jobs to media storage."""
    from apps.jobs.serializers import JobSerializer

    from .serializers import ProjectSerializer

    project = job.project
    data = {
        "format": "realstory-snapshot",
        "version": 1,
        "created_at": timezone.now(),
        "project": ProjectSerializer(project).data,
        "jobs": JobSerializer(project.jobs.exclude(pk=job.pk), many=True).data,
    }
    folder = settings.MEDIA_ROOT / "projects" / str(project.pk) / "snapshots"
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"snapshot-{timezone.now():%Y%m%d-%H%M%S}-{job.pk}.json"
    path.write_text(json.dumps(data, cls=DjangoJSONEncoder, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"file": path.relative_to(settings.MEDIA_ROOT).as_posix(), "bytes": path.stat().st_size}


def register_handlers():
    register(JobKind(key="project_snapshot", label="Sauvegarde du projet", handler=snapshot_project))
