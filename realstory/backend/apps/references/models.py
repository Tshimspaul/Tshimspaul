from django.db import models
from django.db.models import Q

from apps.common.storage import project_upload_to


class ReferenceImage(models.Model):
    """A versioned visual reference for a character, a location or a prop.

    Replacing an image creates a new version and keeps the previous ones, so
    nothing that used the old reference is lost.
    """

    class View(models.TextChoices):
        FACE = "face", "Vue de face"
        PROFILE = "profile", "Vue de profil"
        THREE_QUARTER = "three_quarter", "Vue de trois quarts"
        BACK = "back", "Vue de dos"
        FULL_BODY = "full_body", "Pied"
        EXPRESSION = "expression", "Expression faciale"
        DETAIL = "detail", "Détail"
        OTHER = "other", "Autre"

    class Origin(models.TextChoices):
        UPLOAD = "upload", "Importée"
        GENERATED = "generated", "Générée"

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="references")
    character = models.ForeignKey(
        "characters.Character", on_delete=models.CASCADE, null=True, blank=True, related_name="references"
    )
    location = models.ForeignKey(
        "sets.Location", on_delete=models.CASCADE, null=True, blank=True, related_name="references"
    )
    prop = models.ForeignKey("sets.Prop", on_delete=models.CASCADE, null=True, blank=True, related_name="references")
    view = models.CharField("vue", max_length=20, choices=View, default=View.OTHER)
    expression = models.CharField("expression", max_length=100, blank=True)
    image = models.ImageField("image", upload_to=project_upload_to("references"))
    version = models.PositiveIntegerField("version", default=1)
    is_current = models.BooleanField("version actuelle", default=True)
    origin = models.CharField("origine", max_length=20, choices=Origin, default=Origin.UPLOAD)
    # Kept so a generated image can be reproduced or regenerated identically.
    generation_params = models.JSONField("paramètres de génération", default=dict, blank=True)
    notes = models.TextField("notes", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["view", "expression", "-version"]
        verbose_name = "référence visuelle"
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(character__isnull=False, location__isnull=True, prop__isnull=True)
                    | Q(character__isnull=True, location__isnull=False, prop__isnull=True)
                    | Q(character__isnull=True, location__isnull=True, prop__isnull=False)
                ),
                name="reference_exactly_one_target",
            )
        ]

    @property
    def code(self):
        return f"REF-{self.pk:05d}"

    @property
    def target(self):
        return self.character or self.location or self.prop

    def same_slot(self):
        """References that this one replaces or is replaced by."""
        return ReferenceImage.objects.filter(
            character=self.character, location=self.location, prop=self.prop, view=self.view, expression=self.expression
        )
