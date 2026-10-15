from django.db import transaction
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from . import services
from .models import Job
from .registry import all_kinds
from .serializers import JobCreateSerializer, JobSerializer


class JobViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = JobSerializer

    def get_queryset(self):
        qs = Job.objects.select_related("project")
        for field in ("project", "status"):
            value = self.request.query_params.get(field)
            if value:
                qs = qs.filter(**{field: value})
        return qs

    def create(self, request, *args, **kwargs):
        data = JobCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        job = services.create_job(
            data.validated_data["project"],
            data.validated_data["kind"],
            data.validated_data["params"],
            data.validated_data["label"],
        )
        return Response(JobSerializer(job).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        if instance.status == Job.Status.RUNNING:
            raise ValidationError({"detail": "Impossible de supprimer une tâche en cours."})
        instance.delete()

    def _transition(self, fn):
        try:
            job = fn(self.get_object())
        except services.TransitionError as exc:
            raise ValidationError({"detail": str(exc)})
        return Response(JobSerializer(Job.objects.get(pk=job.pk)).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._transition(services.approve)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._transition(services.reject)

    @action(detail=True, methods=["post"])
    def retry(self, request, pk=None):
        return self._transition(services.retry)


@api_view(["GET"])
def job_kinds(request):
    return Response([{"key": k.key, "label": k.label, "is_paid": k.is_paid} for k in all_kinds()])
