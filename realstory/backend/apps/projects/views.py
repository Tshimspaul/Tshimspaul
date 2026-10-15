from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.jobs.models import Job
from apps.jobs.serializers import JobSerializer

from .models import Project
from .serializers import ProjectSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        qs = Project.objects.all()
        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        return qs


@api_view(["GET"])
def dashboard(request):
    job_counts = dict(Job.objects.values_list("status").annotate(n=Count("id")))
    project_counts = dict(Project.objects.values_list("status").annotate(n=Count("id")))
    return Response(
        {
            "projects": {
                "total": sum(project_counts.values()),
                "by_status": {s: project_counts.get(s, 0) for s in Project.Status.values},
            },
            "jobs": {s: job_counts.get(s, 0) for s in Job.Status.values},
            "recent_projects": ProjectSerializer(
                Project.objects.exclude(status=Project.Status.ARCHIVED)[:5], many=True
            ).data,
            "recent_jobs": JobSerializer(
                Job.objects.select_related("project").order_by("-created_at")[:10], many=True
            ).data,
        }
    )
