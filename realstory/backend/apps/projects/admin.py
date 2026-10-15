from django.contrib import admin

from .models import Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "episode_format", "aspect_ratio", "updated_at"]
    list_filter = ["status", "episode_format"]
    search_fields = ["title"]
