from rest_framework.routers import DefaultRouter

from .views import ContradictionViewSet, FactViewSet, SourceViewSet, StoryViewSet

router = DefaultRouter()
router.register("stories", StoryViewSet, basename="story")
router.register("sources", SourceViewSet, basename="source")
router.register("facts", FactViewSet, basename="fact")
router.register("contradictions", ContradictionViewSet, basename="contradiction")

urlpatterns = router.urls
