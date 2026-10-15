from django.db import transaction
from django.db.models import Max
from rest_framework import serializers

from apps.common.serializers import check_same_project

from .models import ReferenceImage

MAX_BYTES = 20 * 1024 * 1024


class ReferenceImageSerializer(serializers.ModelSerializer):
    view_label = serializers.CharField(source="get_view_display", read_only=True)
    target_code = serializers.SerializerMethodField()

    class Meta:
        model = ReferenceImage
        fields = [
            "id", "code", "project", "character", "location", "prop", "target_code", "view", "view_label",
            "expression", "image", "version", "is_current", "origin", "generation_params", "notes", "created_at",
        ]
        read_only_fields = ["version", "is_current", "created_at"]

    def get_target_code(self, obj):
        return obj.target.code

    def validate_image(self, value):
        if value.size > MAX_BYTES:
            raise serializers.ValidationError("Image trop lourde (20 Mo maximum).")
        return value

    def validate(self, attrs):
        if self.instance:
            for f in ("project", "character", "location", "prop", "view", "expression"):
                if f in attrs and attrs[f] != getattr(self.instance, f):
                    raise serializers.ValidationError({f: "Utilisez « Remplacer » pour changer une référence."})
            return attrs
        project = attrs["project"]
        targets = [attrs.get(k) for k in ("character", "location", "prop") if attrs.get(k)]
        if len(targets) != 1:
            raise serializers.ValidationError({"detail": "Choisissez exactement un personnage, un décor ou un accessoire."})
        check_same_project(project.pk, "target", targets[0])
        if attrs.get("view") == ReferenceImage.View.EXPRESSION and not attrs.get("expression", "").strip():
            raise serializers.ValidationError({"expression": "Précisez l'expression (ex. : colère, joie)."})
        if attrs.get("view") != ReferenceImage.View.EXPRESSION:
            attrs["expression"] = ""
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        """Adding an image to an occupied slot creates a new version of it."""
        probe = ReferenceImage(**{k: v for k, v in validated_data.items() if k != "image"})
        slot = probe.same_slot().select_for_update()
        latest = slot.aggregate(v=Max("version"))["v"] or 0
        slot.update(is_current=False)
        return ReferenceImage.objects.create(**validated_data, version=latest + 1, is_current=True)
