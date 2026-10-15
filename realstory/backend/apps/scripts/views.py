from rest_framework import serializers as drf
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.bible.models import SeriesBible
from apps.common.ordering import reorder
from apps.common.views import ProjectScopedViewSet

from .models import DialogueLine, Episode, Scene
from .serializers import DialogueLineSerializer, EpisodeSerializer, SceneSerializer
from .services import chronology_warnings


def ids_from(request):
    return drf.ListField(child=drf.IntegerField()).run_validation(request.data.get("ids"))


class EpisodeViewSet(ProjectScopedViewSet):
    serializer_class = EpisodeSerializer
    queryset = Episode.objects.prefetch_related("scenes")
    filter_fields = ("season",)

    @action(detail=True, methods=["get"])
    def full(self, request, pk=None):
        """Episode with its scenes, dialogue and checks, for the screenplay view."""
        episode = self.get_object()
        scenes = episode.scenes.select_related("location").prefetch_related("lines__character", "characters", "facts", "shots")
        bible = SeriesBible.objects.filter(project=episode.project_id).first()
        return Response(
            {
                "episode": EpisodeSerializer(episode).data,
                "scenes": SceneSerializer(scenes, many=True).data,
                "target_duration_s": bible.episode_duration_min * 60 if bible else None,
                "warnings": chronology_warnings(episode),
            }
        )

    @action(detail=True, methods=["post"], url_path="reorder-scenes")
    def reorder_scenes(self, request, pk=None):
        reorder(self.get_object().scenes.all(), ids_from(request))
        return Response({"ok": True})


class SceneViewSet(ProjectScopedViewSet):
    serializer_class = SceneSerializer
    queryset = Scene.objects.select_related("episode", "location").prefetch_related("lines__character", "shots")
    project_lookup = "episode__project"
    filter_fields = ("episode",)

    @action(detail=True, methods=["post"], url_path="reorder-lines")
    def reorder_lines(self, request, pk=None):
        reorder(self.get_object().lines.all(), ids_from(request))
        return Response({"ok": True})

    @action(detail=True, methods=["post"], url_path="reorder-shots")
    def reorder_shots(self, request, pk=None):
        reorder(self.get_object().shots.all(), ids_from(request))
        return Response({"ok": True})


class DialogueLineViewSet(ProjectScopedViewSet):
    serializer_class = DialogueLineSerializer
    queryset = DialogueLine.objects.select_related("character", "scene__episode")
    project_lookup = "scene__episode__project"
    filter_fields = ("scene",)
