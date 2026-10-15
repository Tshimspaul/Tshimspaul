from rest_framework.routers import DefaultRouter

from .views import LocationViewSet, PropViewSet

router = DefaultRouter()
router.register("locations", LocationViewSet, basename="location")
router.register("props", PropViewSet, basename="prop")
urlpatterns = router.urls
