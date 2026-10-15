import re

from rest_framework import serializers

from .models import SeriesBible

HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def validate_palette(value):
    if not isinstance(value, list):
        raise serializers.ValidationError("La palette doit être une liste.")
    for item in value:
        if not isinstance(item, dict) or not HEX.match(str(item.get("hex", ""))):
            raise serializers.ValidationError("Chaque couleur doit avoir un code hexadécimal du type #A1B2C3.")
        item["name"] = str(item.get("name", ""))[:60]
    return value


class SeriesBibleSerializer(serializers.ModelSerializer):
    episode_format_label = serializers.CharField(source="get_episode_format_display", read_only=True)

    class Meta:
        model = SeriesBible
        fields = [f.name for f in SeriesBible._meta.fields] + ["episode_format_label"]
        read_only_fields = ["project", "validated_at", "updated_at"]

    def validate_color_palette(self, value):
        return validate_palette(value)
