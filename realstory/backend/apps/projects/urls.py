from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ProjectViewSet, dashboard

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")

urlpatterns = [path("dashboard/", dashboard, name="dashboard"), *router.urls]
