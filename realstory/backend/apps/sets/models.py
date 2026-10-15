from django.db import models


class Location(models.Model):
    class Setting(models.TextChoices):
        INTERIOR = "interior", "Intérieur"
        EXTERIOR = "exterior", "Extérieur"

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="locations")
    name = models.CharField("nom", max_length=200)
    setting = models.CharField("type", max_length=20, choices=Setting, default=Setting.EXTERIOR)
    description = models.TextField("description", blank=True)
    period = models.CharField("période", max_length=200, blank=True)
    is_real_place = models.BooleanField("lieu réel", default=False)
    documented_details = models.TextField("détails documentés", blank=True)
    imagined_details = models.TextField("détails imaginés", blank=True)
    color_palette = models.JSONField("palette", default=list, blank=True)
    lighting_notes = models.TextField("lumière et moments de la journée", blank=True)
    continuity_notes = models.TextField("règles de continuité", blank=True)
    locked_description = models.TextField("description visuelle de référence", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "décor"

    @property
    def code(self):
        return f"LOC-{self.pk:04d}"

    def __str__(self):
        return self.name


class Prop(models.Model):
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="props")
    name = models.CharField("nom", max_length=200)
    description = models.TextField("description", blank=True)
    owner = models.ForeignKey(
        "characters.Character", on_delete=models.SET_NULL, null=True, blank=True, related_name="props",
        verbose_name="appartient à",
    )
    is_documented = models.BooleanField("objet documenté", default=False)
    continuity_notes = models.TextField("règles de continuité", blank=True)
    locked_description = models.TextField("description visuelle de référence", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "accessoire"

    @property
    def code(self):
        return f"PRP-{self.pk:04d}"

    def __str__(self):
        return self.name
