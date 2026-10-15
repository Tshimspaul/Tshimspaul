from rest_framework import serializers

from apps.projects.models import Project

from .models import Job


class JobSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    project_title = serializers.CharField(source="project.title", read_only=True)

    class Meta:
        model = Job
        fields = [
            "id",
            "project",
            "project_title",
            "kind",
            "label",
            "status",
            "status_label",
            "is_paid",
            "estimated_cost",
            "actual_cost",
            "params",
            "result",
            "error",
            "attempts",
            "approved_at",
            "started_at",
            "finished_at",
            "created_at",
        ]
        read_only_fields = fields


class JobCreateSerializer(serializers.Serializer):
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())
    kind = serializers.CharField()
    params = serializers.DictField(required=False, default=dict)
    label = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_kind(self, value):
        from .registry import get_kind

        try:
            get_kind(value)
        except KeyError:
            raise serializers.ValidationError("Type de tâche inconnu.")
        return value
