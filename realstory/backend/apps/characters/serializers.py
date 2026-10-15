from rest_framework import serializers

from apps.bible.serializers import validate_palette
from apps.common.serializers import check_same_project

from .models import Character, Relationship

REQUIRED_VIEWS = ["face", "profile", "three_quarter"]
MIN_EXPRESSIONS = 3


class CharacterSerializer(serializers.ModelSerializer):
    role_label = serializers.CharField(source="get_role_display", read_only=True)
    continuity = serializers.SerializerMethodField()

    class Meta:
        model = Character
        fields = ["id", "code", *[f.name for f in Character._meta.fields if f.name != "id"], "role_label", "continuity"]
        read_only_fields = ["created_at", "updated_at"]

    def validate_color_palette(self, value):
        return validate_palette(value)

    def validate_project(self, value):
        if self.instance and value != self.instance.project:
            raise serializers.ValidationError("Le projet d'un personnage ne peut pas changer.")
        return value

    def get_continuity(self, obj):
        refs = [r for r in obj.references.all() if r.is_current]
        views = {r.view for r in refs}
        expressions = sorted({r.expression for r in refs if r.view == "expression" and r.expression})
        missing = [v for v in REQUIRED_VIEWS if v not in views]
        return {
            "views": sorted(views),
            "expressions": expressions,
            "missing_views": missing,
            "missing_expressions": max(0, MIN_EXPRESSIONS - len(expressions)),
            "complete": not missing and len(expressions) >= MIN_EXPRESSIONS and bool(obj.locked_description.strip()),
        }


class RelationshipSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source="source.name", read_only=True)
    target_name = serializers.CharField(source="target.name", read_only=True)

    class Meta:
        model = Relationship
        fields = ["id", "project", "source", "source_name", "target", "target_name", "kind", "description"]

    def validate(self, attrs):
        project = attrs.get("project") or self.instance.project
        source = attrs.get("source") or self.instance.source
        target = attrs.get("target") or self.instance.target
        check_same_project(project.pk, "source", source)
        check_same_project(project.pk, "target", target)
        if source == target:
            raise serializers.ValidationError({"target": "Un personnage ne peut pas être en relation avec lui-même."})
        return attrs
