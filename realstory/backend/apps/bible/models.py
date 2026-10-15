from django.db import models

from apps.projects.models import Project

# Allowed episode durations (minutes) per format, from the production brief.
FORMAT_DURATIONS = {
    Project.EpisodeFormat.SHORT: (3, 5),
    Project.EpisodeFormat.MEDIUM: (8, 12),
    Project.EpisodeFormat.LONG: (20, 30),
}


class SeriesBible(models.Model):
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name="bible")
    series_title = models.CharField("titre de la série", max_length=200, blank=True)
    genre = models.CharField("genre", max_length=200, blank=True)
    target_audience = models.CharField("public cible", max_length=200, blank=True)
    main_theme = models.TextField("thème principal", blank=True)
    message = models.TextField("message de la série", blank=True)
    historical_context = models.TextField("contexte historique", blank=True)
    synopsis = models.TextField("synopsis général", blank=True)
    main_conflict = models.TextField("conflit principal", blank=True)
    stakes = models.TextField("enjeux dramatiques", blank=True)
    character_arcs = models.TextField("évolution des personnages", blank=True)
    visual_identity = models.TextField("identité visuelle", blank=True)
    animation_style = models.TextField("style d'animation", blank=True)
    color_palette = models.JSONField("palette de couleurs", default=list, blank=True)
    sound_ambience = models.TextField("ambiance sonore", blank=True)
    episode_format = models.CharField(
        "format", max_length=20, choices=Project.EpisodeFormat, default=Project.EpisodeFormat.MEDIUM
    )
    seasons = models.PositiveSmallIntegerField("nombre de saisons", default=1)
    episodes_per_season = models.PositiveSmallIntegerField("épisodes par saison", default=6)
    episode_duration_min = models.PositiveSmallIntegerField("durée d'un épisode (min)", default=10)
    validated_at = models.DateTimeField("validée le", null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "bible de série"
