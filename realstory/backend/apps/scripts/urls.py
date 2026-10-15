from rest_framework.routers import DefaultRouter

from .views import DialogueLineViewSet, EpisodeViewSet, SceneViewSet

router = DefaultRouter()
router.register("episodes", EpisodeViewSet, basename="episode")
router.register("scenes", SceneViewSet, basename="scene")
router.register("lines", DialogueLineViewSet, basename="line")
urlpatterns = router.urls
