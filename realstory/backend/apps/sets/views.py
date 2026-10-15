from apps.common.views import ProjectScopedViewSet

from .models import Location, Prop
from .serializers import LocationSerializer, PropSerializer


class LocationViewSet(ProjectScopedViewSet):
    serializer_class = LocationSerializer
    queryset = Location.objects.all()


class PropViewSet(ProjectScopedViewSet):
    serializer_class = PropSerializer
    queryset = Prop.objects.select_related("owner")
