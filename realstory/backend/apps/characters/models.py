from django.db import models


class Character(models.Model):
    class Role(models.TextChoices):
        MAIN = "main", "Principal"
        SECONDARY = "secondary", "Secondaire"
        MINOR = "minor", "Figurant"

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="characters")
    name = models.CharField("nom", max_length=200)
    role = models.CharField("rôle", max_length=20, choices=Role, default=Role.SECONDARY)
    is_real_person = models.BooleanField("personne réelle", default=False)
    age = models.CharField("âge", max_length=50, blank=True)
    sex = models.CharField("sexe", max_length=50, blank=True)
    origin = models.CharField("origine", max_length=200, blank=True)
    # Visual description
    appearance = models.TextField("apparence physique", blank=True)
    skin_tone = models.CharField("couleur de peau", max_length=100, blank=True)
    hairstyle = models.CharField("coiffure", max_length=200, blank=True)
    clothing = models.TextField("vêtements", blank=True)
    height = models.CharField("taille approximative", max_length=50, blank=True)
    build = models.CharField("morphologie", max_length=200, blank=True)
    # Psychology and story
    personality = models.TextField("personnalité", blank=True)
    goals = models.TextField("objectifs", blank=True)
    fears = models.TextField("peurs", blank=True)
    strengths = models.TextField("forces", blank=True)
    weaknesses = models.TextField("faiblesses", blank=True)
    speech_style = models.TextField("façon de parler", blank=True)
    arc = models.TextField("évolution au cours de la série", blank=True)
    # Real people: separate what is documented from what is imagined.
    documented_details = models.TextField("détails documentés", blank=True)
    imagined_details = models.TextField("détails imaginés", blank=True)
    # Visual continuity sheet
    color_palette = models.JSONField("palette du personnage", default=list, blank=True)
    distinguishing_marks = models.TextField("signes distinctifs", blank=True)
    continuity_notes = models.TextField("règles de continuité", blank=True)
    locked_description = models.TextField(
        "description visuelle de référence",
        blank=True,
        help_text="Texte figé réutilisé tel quel pour chaque génération d'image.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["role", "name"]
        verbose_name = "personnage"

    @property
    def code(self):
        return f"CHR-{self.pk:04d}"

    def __str__(self):
        return self.name


class Relationship(models.Model):
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="relationships")
    source = models.ForeignKey(Character, on_delete=models.CASCADE, related_name="relationships_out")
    target = models.ForeignKey(Character, on_delete=models.CASCADE, related_name="relationships_in")
    kind = models.CharField("relation", max_length=100)
    description = models.TextField("description", blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=~models.Q(source=models.F("target")), name="relationship_not_self")
        ]
