from rest_framework import serializers

from apps.common.ordering import next_order
from apps.common.serializers import check_same_project

from .models import Shot


class ShotSerializer(serializers.ModelSerializer):
    shot_type_label = serializers.CharField(source="get_shot_type_display", read_only=True)
    camera_angle_label = serializers.CharField(source="get_camera_angle_display", read_only=True)
    camera_movement_label = serializers.CharField(source="get_camera_movement_display", read_only=True)
    main_character_name = serializers.CharField(source="main_character.name", read_only=True, default=None)

    class Meta:
        model = Shot
        fields = [
            "id", "code", "scene", "order", "description", "main_character", "main_character_name", "action",
            "shot_type", "shot_type_label", "camera_angle", "camera_angle_label", "camera_movement",
            "camera_movement_label", "duration_s", "dialogue", "sound_effects", "lighting", "references",
            "reference_notes",
        ]
        read_only_fields = ["order"]

    def validate_duration_s(self, value):
        if value <= 0:
            raise serializers.ValidationError("La durée doit être positive.")
        return value

    def validate(self, attrs):
        scene = attrs.get("scene") or self.instance.scene
        if self.instance and scene != self.instance.scene:
            raise serializers.ValidationError({"scene": "Utilisez la réorganisation pour déplacer un plan."})
        project_id = scene.episode.project_id
        if "main_character" in attrs:
            check_same_project(project_id, "main_character", attrs["main_character"])
        if "references" in attrs:
            check_same_project(project_id, "references", attrs["references"])
        return attrs

    def create(self, validated_data):
        validated_data["order"] = next_order(validated_data["scene"].shots.all())
        return super().create(validated_data)
