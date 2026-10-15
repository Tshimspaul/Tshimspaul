from django.contrib import admin

from .models import Job


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ["label", "project", "status", "is_paid", "estimated_cost", "created_at"]
    list_filter = ["status", "is_paid", "kind"]
