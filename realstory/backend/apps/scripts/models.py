from django.db import models


class Episode(models.Model):
    class Ending(models.TextChoices):
        RESOLUTION = "resolution", "Conclusion satisfaisante"
        CLIFFHANGER = "cliffhanger", "Suspense"

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="episodes")
    season = models.PositiveSmallIntegerField("saison", default=1)
    number = models.PositiveSmallIntegerField("numéro")
    title = models.CharField("titre", max_length=200)
    summary = models.TextField("résumé", blank=True)
    opening = models.TextField("scène d'ouverture", blank=True)
    problem = models.TextField("présentation du problème", blank=True)
    conflict = models.TextField("développement du conflit", blank=True)
    tension = models.TextField("moments de tension", blank=True)
    revelations = models.TextField("révélations progressives", blank=True)
    climax = models.TextField("climax", blank=True)
    ending = models.TextField("conclusion", blank=True)
    ending_type = models.CharField("type de fin", max_length=20, choices=Ending, default=Ending.RESOLUTION)
    transition_next = models.TextField("transition vers l'épisode suivant", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["season", "number"]
        constraints = [models.UniqueConstraint(fields=["project", "season", "number"], name="unique_episode_number")]
        verbose_name = "épisode"

    @property
    def code(self):
        return f"S{self.season:02d}E{self.number:02d}"

    def __str__(self):
        return f"{self.code} {self.title}"


class Scene(models.Model):
    episode = models.ForeignKey(Episode, on_delete=models.CASCADE, related_name="scenes")
    order = models.PositiveIntegerField("ordre", default=0)
    heading = models.CharField("titre de la scène", max_length=200)
    location = models.ForeignKey(
        "sets.Location", on_delete=models.SET_NULL, null=True, blank=True, related_name="scenes", verbose_name="lieu"
    )
    time_of_day = models.CharField("heure ou moment", max_length=100, blank=True)
    period = models.CharField("période", max_length=100, blank=True)
    characters = models.ManyToManyField("characters.Character", blank=True, related_name="scenes")
    action = models.TextField("actions", blank=True)
    emotions = models.TextField("émotions", blank=True)
    camera_notes = models.TextField("mouvements de caméra", blank=True)
    sound_notes = models.TextField("indications sonores", blank=True)
    music_notes = models.TextField("indications musicales", blank=True)
    estimated_duration_s = models.PositiveIntegerField("durée estimée (s)", default=0)
    facts = models.ManyToManyField("stories.Fact", blank=True, related_name="scenes", verbose_name="éléments historiques")
    is_flashback = models.BooleanField("retour en arrière", default=False)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "scène"

    @property
    def project_id(self):
        return self.episode.project_id

    @property
    def code(self):
        return f"SCN-{self.pk:05d}"


class DialogueLine(models.Model):
    """A line of dialogue, always labelled with its authenticity."""

    class Kind(models.TextChoices):
        AUTHENTIC = "authentic", "Citation authentique (sourcée)"
        RECONSTRUCTED = "reconstructed", "Dialogue reconstitué"
        FICTION = "fiction", "Dialogue de fiction"

    scene = models.ForeignKey(Scene, on_delete=models.CASCADE, related_name="lines")
    order = models.PositiveIntegerField("ordre", default=0)
    character = models.ForeignKey("characters.Character", on_delete=models.CASCADE, related_name="lines")
    text = models.TextField("réplique")
    parenthetical = models.CharField("indication de jeu", max_length=200, blank=True)
    kind = models.CharField("nature", max_length=20, choices=Kind)
    source = models.ForeignKey(
        "stories.Source", on_delete=models.PROTECT, null=True, blank=True, related_name="quotes"
    )

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "réplique"
