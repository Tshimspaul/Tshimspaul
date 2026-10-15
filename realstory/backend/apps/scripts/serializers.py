from rest_framework import serializers

from apps.bible.services import is_validated
from apps.common.ordering import next_order
from apps.common.serializers import check_same_project

from .models import DialogueLine, Episode, Scene


class DialogueLineSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    character_name = serializers.CharField(source="character.name", read_only=True)

    class Meta:
        model = DialogueLine
        fields = ["id", "scene", "order", "character", "character_name", "text", "parenthetical", "kind", "kind_label", "source"]
        read_only_fields = ["order"]
        extra_kwargs = {"kind": {"required": False}}

    def validate(self, attrs):
        scene = attrs.get("scene") or self.instance.scene
        if self.instance and scene != self.instance.scene:
            raise serializers.ValidationError({"scene": "Une réplique ne change pas de scène."})
        project_id = scene.episode.project_id
        character = attrs.get("character") or self.instance.character
        source = attrs["source"] if "source" in attrs else getattr(self.instance, "source", None)
        kind = attrs.get("kind") or getattr(self.instance, "kind", None)
        check_same_project(project_id, "character", character)
        check_same_project(project_id, "source", source)
        if not character.is_real_person:
            if kind == DialogueLine.Kind.AUTHENTIC:
                raise serializers.ValidationError({"kind": "Un personnage fictif ne peut pas avoir de citation authentique."})
            kind = DialogueLine.Kind.FICTION
        elif kind not in (DialogueLine.Kind.AUTHENTIC, DialogueLine.Kind.RECONSTRUCTED):
            # Words given to a real person are reconstructed unless proven otherwise.
            kind = DialogueLine.Kind.RECONSTRUCTED
        if kind == DialogueLine.Kind.AUTHENTIC and source is None:
            raise serializers.ValidationError({"source": "Une citation authentique doit indiquer sa source."})
        if kind != DialogueLine.Kind.AUTHENTIC:
            attrs["source"] = None
        attrs["kind"] = kind
        return attrs

    def create(self, validated_data):
        scene = validated_data["scene"]
        validated_data["order"] = next_order(scene.lines.all())
        line = super().create(validated_data)
        scene.characters.add(line.character)
        return line

    def update(self, instance, validated_data):
        line = super().update(instance, validated_data)
        line.scene.characters.add(line.character)
        return line


class SceneSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source="location.name", read_only=True, default=None)
    lines = DialogueLineSerializer(many=True, read_only=True)
    shot_count = serializers.IntegerField(source="shots.count", read_only=True)

    class Meta:
        model = Scene
        fields = [
            "id", "code", "episode", "order", "heading", "location", "location_name", "time_of_day", "period",
            "characters", "action", "emotions", "camera_notes", "sound_notes", "music_notes",
            "estimated_duration_s", "facts", "is_flashback", "lines", "shot_count",
        ]
        read_only_fields = ["order"]

    def validate(self, attrs):
        episode = attrs.get("episode") or self.instance.episode
        if self.instance and episode != self.instance.episode:
            raise serializers.ValidationError({"episode": "Utilisez la réorganisation pour déplacer une scène."})
        for field in ("location", "characters", "facts"):
            if field in attrs:
                check_same_project(episode.project_id, field, attrs[field])
        return attrs

    def create(self, validated_data):
        validated_data["order"] = next_order(validated_data["episode"].scenes.all())
        return super().create(validated_data)


class EpisodeSerializer(serializers.ModelSerializer):
    ending_type_label = serializers.CharField(source="get_ending_type_display", read_only=True)
    scene_count = serializers.IntegerField(source="scenes.count", read_only=True)
    duration_s = serializers.SerializerMethodField()

    class Meta:
        model = Episode
        fields = [
            "id", "code", "project", "season", "number", "title", "summary", "opening", "problem", "conflict",
            "tension", "revelations", "climax", "ending", "ending_type", "ending_type_label", "transition_next",
            "scene_count", "duration_s", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
        validators = []  # uniqueness is checked in validate() with a French message

    def get_duration_s(self, obj):
        return sum(s.estimated_duration_s for s in obj.scenes.all())

    def validate(self, attrs):
        project = attrs.get("project") or self.instance.project
        if self.instance and project != self.instance.project:
            raise serializers.ValidationError({"project": "Un épisode ne change pas de projet."})
        if not self.instance and not is_validated(project.pk):
            raise serializers.ValidationError(
                {"detail": "La bible de série doit être validée avant d'écrire les épisodes."}
            )
        season = attrs.get("season", getattr(self.instance, "season", 1))
        number = attrs.get("number", getattr(self.instance, "number", None))
        clash = Episode.objects.filter(project=project, season=season, number=number)
        if self.instance:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError({"number": f"L'épisode {number} de la saison {season} existe déjà."})
        return attrs
