from rest_framework.routers import DefaultRouter

from .views import CharacterViewSet, RelationshipViewSet

router = DefaultRouter()
router.register("characters", CharacterViewSet, basename="character")
router.register("relationships", RelationshipViewSet, basename="relationship")
urlpatterns = router.urls
