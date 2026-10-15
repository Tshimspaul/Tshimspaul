from django.db import models


class Shot(models.Model):
    class ShotType(models.TextChoices):
        WIDE = "wide", "Plan général"
        MEDIUM = "medium", "Plan moyen"
        CLOSE_UP = "close_up", "Gros plan"
        EXTREME_CLOSE_UP = "extreme_close_up", "Très gros plan"
        POV = "pov", "Plan subjectif"
        TRACKING = "tracking", "Travelling"
        PAN = "pan", "Panoramique"
        TRANSITION = "transition", "Plan de transition"

    class Angle(models.TextChoices):
        EYE_LEVEL = "eye_level", "À hauteur d'yeux"
        HIGH = "high", "Plongée"
        LOW = "low", "Contre-plongée"
        OVERHEAD = "overhead", "Vue aérienne"
        DUTCH = "dutch", "Cadre penché"

    class Movement(models.TextChoices):
        STATIC = "static", "Fixe"
        TRACKING = "tracking", "Travelling"
        PAN = "pan", "Panoramique"
        TILT = "tilt", "Bascule"
        ZOOM = "zoom", "Zoom"
        CRANE = "crane", "Grue"
        HANDHELD = "handheld", "Caméra à l'épaule"

    scene = models.ForeignKey("scripts.Scene", on_delete=models.CASCADE, related_name="shots")
    order = models.PositiveIntegerField("ordre", default=0)
    description = models.TextField("description visuelle")
    main_character = models.ForeignKey(
        "characters.Character", on_delete=models.SET_NULL, null=True, blank=True, related_name="shots"
    )
    action = models.TextField("action", blank=True)
    shot_type = models.CharField("cadrage", max_length=20, choices=ShotType, default=ShotType.MEDIUM)
    camera_angle = models.CharField("angle", max_length=20, choices=Angle, default=Angle.EYE_LEVEL)
    camera_movement = models.CharField("mouvement", max_length=20, choices=Movement, default=Movement.STATIC)
    duration_s = models.DecimalField("durée estimée (s)", max_digits=6, decimal_places=1, default=3)
    dialogue = models.TextField("dialogues", blank=True)
    sound_effects = models.TextField("effets sonores", blank=True)
    lighting = models.TextField("lumière", blank=True)
    references = models.ManyToManyField("references.ReferenceImage", blank=True, related_name="shots")
    reference_notes = models.TextField("références visuelles nécessaires", blank=True)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "plan"

    @property
    def code(self):
        """Stable identifier: never changes when shots are reordered."""
        return f"SHOT-{self.pk:05d}"
