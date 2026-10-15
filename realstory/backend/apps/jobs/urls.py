from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import JobViewSet, job_kinds

router = DefaultRouter()
router.register("jobs", JobViewSet, basename="job")

urlpatterns = [path("job-kinds/", job_kinds, name="job-kinds"), *router.urls]
