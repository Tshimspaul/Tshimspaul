from rest_framework import serializers

from apps.jobs.services import committed_cost

from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    episode_format_label = serializers.CharField(source="get_episode_format_display", read_only=True)
    committed_cost = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "description",
            "status",
            "status_label",
            "episode_format",
            "episode_format_label",
            "aspect_ratio",
            "budget_limit",
            "currency",
            "committed_cost",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_committed_cost(self, obj):
        return str(committed_cost(obj))

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le titre est obligatoire.")
        return value

    def validate_budget_limit(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Le budget ne peut pas être négatif.")
        return value
