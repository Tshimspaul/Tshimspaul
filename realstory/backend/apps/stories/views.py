from django.shortcuts import get_object_or_404
from rest_framework import serializers as drf, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.common.views import ProjectScopedViewSet
from apps.projects.models import Project

from . import services
from .models import Contradiction, Fact, Source, Story
from .serializers import (
    ContradictionSerializer,
    FactSerializer,
    ResolveSerializer,
    SourceSerializer,
    StorySerializer,
    resolve_contradiction,
)


class InvalidatesStoryMixin:
    """Changing the story material clears the historical validation."""

    def perform_create(self, serializer):
        obj = serializer.save()
        services.invalidate(obj.project_id)

    def perform_update(self, serializer):
        obj = serializer.save()
        services.invalidate(obj.project_id)

    def perform_destroy(self, instance):
        project_id = instance.project_id
        instance.delete()
        services.invalidate(project_id)


class StoryViewSet(viewsets.GenericViewSet):
    """One story per project, addressed by project id: /api/stories/<project_id>/."""

    serializer_class = StorySerializer
    queryset = Story.objects.all()

    def get_object(self):
        return services.get_story(get_object_or_404(Project, pk=self.kwargs["pk"]))

    def retrieve(self, request, pk=None):
        return Response(StorySerializer(self.get_object()).data)

    def partial_update(self, request, pk=None):
        story = self.get_object()
        ser = StorySerializer(story, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        services.invalidate(story.project_id)
        story.refresh_from_db()
        return Response(StorySerializer(story).data)

    @action(detail=True, methods=["get"], url_path="validation-sheet")
    def validation_sheet(self, request, pk=None):
        story = self.get_object()
        sheet = services.validation_sheet(story)
        return Response(
            {
                "story": StorySerializer(story).data,
                "facts_by_category": {
                    k: FactSerializer(v, many=True).data for k, v in sheet["facts_by_category"].items()
                },
                "sources": SourceSerializer(story.project.sources.all(), many=True).data,
                "open_contradictions": ContradictionSerializer(sheet["open_contradictions"], many=True).data,
                "issues": sheet["issues"],
                "can_validate": sheet["can_validate"],
            }
        )

    @action(detail=True, methods=["post"])
    def validate(self, request, pk=None):
        note = drf.CharField(allow_blank=True, required=False).run_validation(request.data.get("note", ""))
        try:
            story = services.validate(self.get_object(), note)
        except services.ValidationBlocked as exc:
            raise ValidationError({"detail": exc.issues})
        return Response(StorySerializer(story).data)


class SourceViewSet(InvalidatesStoryMixin, ProjectScopedViewSet):
    serializer_class = SourceSerializer
    queryset = Source.objects.all()
    filter_fields = ("kind",)


class FactViewSet(InvalidatesStoryMixin, ProjectScopedViewSet):
    serializer_class = FactSerializer
    queryset = Fact.objects.prefetch_related("sources", "contradictions")
    filter_fields = ("category",)


class ContradictionViewSet(InvalidatesStoryMixin, ProjectScopedViewSet):
    serializer_class = ContradictionSerializer
    queryset = Contradiction.objects.prefetch_related("facts")
    filter_fields = ("status",)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        contradiction = self.get_object()
        if contradiction.status != Contradiction.Status.OPEN:
            raise ValidationError({"detail": "Cette contradiction est déjà résolue."})
        data = ResolveSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        resolve_contradiction(contradiction, data.validated_data["resolution"])
        services.invalidate(contradiction.project_id)
        return Response(ContradictionSerializer(contradiction).data)
