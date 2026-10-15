from django.utils import timezone
from rest_framework import serializers

from apps.common.serializers import check_same_project

from .models import Contradiction, Fact, Source, Story


class StorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Story
        fields = [
            "id", "project", "title", "summary", "period", "places", "must_keep",
            "may_dramatize", "strictly_historical", "validated_at", "validation_note", "updated_at",
        ]
        read_only_fields = ["project", "validated_at", "validation_note", "updated_at"]


class SourceSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = Source
        fields = ["id", "code", "project", "kind", "kind_label", "title", "author", "date", "reference", "notes", "file", "created_at"]
        read_only_fields = ["created_at"]

    def validate_project(self, value):
        if self.instance and value != self.instance.project:
            raise serializers.ValidationError("Le projet d'une source ne peut pas changer.")
        return value


class FactSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    treatment_label = serializers.CharField(source="get_treatment_display", read_only=True)
    open_contradictions = serializers.SerializerMethodField()

    class Meta:
        model = Fact
        fields = [
            "id", "code", "project", "statement", "category", "category_label", "treatment", "treatment_label",
            "must_keep", "event_date", "chronology", "place", "people", "sources", "notes", "open_contradictions",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_open_contradictions(self, obj):
        return [c.pk for c in obj.contradictions.all() if c.status == Contradiction.Status.OPEN]

    def validate(self, attrs):
        project = attrs.get("project") or self.instance.project
        if self.instance and project != self.instance.project:
            raise serializers.ValidationError({"project": "Le projet d'un élément ne peut pas changer."})
        sources = attrs["sources"] if "sources" in attrs else (list(self.instance.sources.all()) if self.instance else [])
        check_same_project(project.pk, "sources", sources)
        category = attrs.get("category") or self.instance.category
        if category == Fact.Category.VERIFIED and not sources:
            raise serializers.ValidationError({"sources": "Un fait vérifié doit citer au moins une source."})
        treatment = attrs.get("treatment") or getattr(self.instance, "treatment", Fact.Treatment.STRICT)
        if category == Fact.Category.FICTION and treatment == Fact.Treatment.STRICT:
            # An invented element can never be presented as strictly historical.
            attrs["treatment"] = Fact.Treatment.DRAMATIZABLE
        return attrs


class ContradictionSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Contradiction
        fields = ["id", "project", "description", "facts", "status", "status_label", "resolution", "resolved_at", "created_at"]
        read_only_fields = ["status", "resolution", "resolved_at", "created_at"]

    def validate(self, attrs):
        project = attrs.get("project") or self.instance.project
        if "facts" in attrs:
            if len(attrs["facts"]) < 2:
                raise serializers.ValidationError({"facts": "Une contradiction concerne au moins deux éléments."})
            check_same_project(project.pk, "facts", attrs["facts"])
        return attrs


class ResolveSerializer(serializers.Serializer):
    resolution = serializers.CharField()

    def validate_resolution(self, value):
        if not value.strip():
            raise serializers.ValidationError("Expliquez la décision prise.")
        return value.strip()


def resolve_contradiction(contradiction, resolution):
    contradiction.status = Contradiction.Status.RESOLVED
    contradiction.resolution = resolution
    contradiction.resolved_at = timezone.now()
    contradiction.save()
    return contradiction
