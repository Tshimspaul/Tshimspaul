from rest_framework import serializers

from apps.bible.serializers import validate_palette
from apps.common.serializers import check_same_project

from .models import Location, Prop


class LocationSerializer(serializers.ModelSerializer):
    setting_label = serializers.CharField(source="get_setting_display", read_only=True)

    class Meta:
        model = Location
        fields = ["id", "code", *[f.name for f in Location._meta.fields if f.name != "id"], "setting_label"]
        read_only_fields = ["created_at"]

    def validate_color_palette(self, value):
        return validate_palette(value)

    def validate_project(self, value):
        if self.instance and value != self.instance.project:
            raise serializers.ValidationError("Le projet d'un décor ne peut pas changer.")
        return value


class PropSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.name", read_only=True, default=None)

    class Meta:
        model = Prop
        fields = ["id", "code", *[f.name for f in Prop._meta.fields if f.name != "id"], "owner_name"]
        read_only_fields = ["created_at"]

    def validate(self, attrs):
        project = attrs.get("project") or self.instance.project
        if self.instance and project != self.instance.project:
            raise serializers.ValidationError({"project": "Le projet d'un accessoire ne peut pas changer."})
        check_same_project(project.pk, "owner", attrs.get("owner"))
        return attrs
