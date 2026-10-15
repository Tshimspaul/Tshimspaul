from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.projects.models import Project

from . import services
from .models import FORMAT_DURATIONS
from .serializers import SeriesBibleSerializer


def payload(bible):
    return {**SeriesBibleSerializer(bible).data, "issues": services.issues(bible)}


class BibleViewSet(viewsets.GenericViewSet):
    """One bible per project, addressed by project id: /api/bibles/<project_id>/."""

    serializer_class = SeriesBibleSerializer

    def get_object(self):
        return services.get_bible(get_object_or_404(Project, pk=self.kwargs["pk"]))

    def retrieve(self, request, pk=None):
        return Response(payload(self.get_object()))

    def partial_update(self, request, pk=None):
        bible = self.get_object()
        ser = SeriesBibleSerializer(bible, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        # Any edit sends a validated bible back to draft.
        ser.save(validated_at=None)
        return Response(payload(bible))

    @action(detail=True, methods=["post"])
    def validate(self, request, pk=None):
        try:
            bible = services.validate(self.get_object())
        except services.BibleBlocked as exc:
            raise ValidationError({"detail": exc.issues})
        return Response(payload(bible))

    @action(detail=False, methods=["get"])
    def formats(self, request):
        return Response(
            [
                {"key": key, "label": Project.EpisodeFormat(key).label, "min": low, "max": high}
                for key, (low, high) in FORMAT_DURATIONS.items()
            ]
        )
