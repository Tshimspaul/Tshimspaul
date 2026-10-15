from django.db import models


class Project(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Brouillon"
        ACTIVE = "active", "En production"
        ARCHIVED = "archived", "Archivé"

    class EpisodeFormat(models.TextChoices):
        SHORT = "short", "Format court (3 à 5 min)"
        MEDIUM = "medium", "Format intermédiaire (8 à 12 min)"
        LONG = "long", "Format long (20 à 30 min)"

    class AspectRatio(models.TextChoices):
        LANDSCAPE = "16:9", "Horizontal 16:9"
        PORTRAIT = "9:16", "Vertical 9:16"
        SQUARE = "1:1", "Carré 1:1"

    title = models.CharField("titre", max_length=200)
    description = models.TextField("description", blank=True)
    status = models.CharField("statut", max_length=20, choices=Status, default=Status.DRAFT)
    episode_format = models.CharField(
        "format des épisodes", max_length=20, choices=EpisodeFormat, default=EpisodeFormat.MEDIUM
    )
    aspect_ratio = models.CharField(
        "format d'image", max_length=5, choices=AspectRatio, default=AspectRatio.LANDSCAPE
    )
    # Upper bound for paid generation costs. Null means "no paid task may be approved".
    budget_limit = models.DecimalField(
        "budget maximum", max_digits=10, decimal_places=2, null=True, blank=True
    )
    currency = models.CharField("devise", max_length=3, default="EUR")
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "projet"
        verbose_name_plural = "projets"

    def __str__(self):
        return self.title
