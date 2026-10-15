from apps.common.views import ProjectScopedViewSet

from .models import Character, Relationship
from .serializers import CharacterSerializer, RelationshipSerializer


class CharacterViewSet(ProjectScopedViewSet):
    serializer_class = CharacterSerializer
    queryset = Character.objects.prefetch_related("references")
    filter_fields = ("role",)


class RelationshipViewSet(ProjectScopedViewSet):
    serializer_class = RelationshipSerializer
    queryset = Relationship.objects.select_related("source", "target")
