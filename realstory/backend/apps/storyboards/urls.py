from rest_framework.routers import DefaultRouter

from .views import ShotViewSet

router = DefaultRouter()
router.register("shots", ShotViewSet, basename="shot")
urlpatterns = router.urls
