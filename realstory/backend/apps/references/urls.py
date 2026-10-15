from rest_framework.routers import DefaultRouter

from .views import ReferenceImageViewSet

router = DefaultRouter()
router.register("references", ReferenceImageViewSet, basename="reference")
urlpatterns = router.urls
