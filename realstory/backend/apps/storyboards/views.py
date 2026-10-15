from apps.common.views import ProjectScopedViewSet

from .models import Shot
from .serializers import ShotSerializer


class ShotViewSet(ProjectScopedViewSet):
    serializer_class = ShotSerializer
    queryset = Shot.objects.select_related("main_character", "scene__episode").prefetch_related("references")
    project_lookup = "scene__episode__project"
    filter_fields = ("scene", "scene__episode")
