from rest_framework.routers import DefaultRouter

from .views import BibleViewSet

router = DefaultRouter()
router.register("bibles", BibleViewSet, basename="bible")
urlpatterns = router.urls
