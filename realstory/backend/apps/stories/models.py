from django.db import models

from apps.common.storage import project_upload_to


class Story(models.Model):
    """The real story behind a project (one per project)."""

    project = models.OneToOneField("projects.Project", on_delete=models.CASCADE, related_name="story")
    title = models.CharField("titre de l'histoire", max_length=200, blank=True)
    summary = models.TextField("résumé", blank=True)
    period = models.CharField("période historique", max_length=200, blank=True)
    places = models.TextField("pays et lieux concernés", blank=True)
    must_keep = models.TextField("événements à conserver absolument", blank=True)
    may_dramatize = models.TextField("éléments pouvant être dramatisés", blank=True)
    strictly_historical = models.TextField("éléments strictement historiques", blank=True)
    # Set by the human validation of the historical sheet; cleared by any later change.
    validated_at = models.DateTimeField("validée le", null=True, blank=True)
    validation_note = models.TextField("note de validation", blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "histoire"

    def __str__(self):
        return self.title or f"Histoire du projet {self.project_id}"


class Source(models.Model):
    class Kind(models.TextChoices):
        DOCUMENT = "document", "Document de référence"
        PHOTO = "photo", "Photographie"
        TESTIMONY = "testimony", "Témoignage"
        ARCHIVE = "archive", "Archive"
        OTHER = "other", "Autre"

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="sources")
    kind = models.CharField("type", max_length=20, choices=Kind, default=Kind.DOCUMENT)
    title = models.CharField("titre", max_length=300)
    author = models.CharField("auteur ou témoin", max_length=200, blank=True)
    date = models.CharField("date", max_length=100, blank=True)
    reference = models.CharField("référence (cote, URL, ouvrage)", max_length=500, blank=True)
    notes = models.TextField("notes", blank=True)
    file = models.FileField("fichier", upload_to=project_upload_to("sources"), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["title"]
        verbose_name = "source"

    @property
    def code(self):
        return f"SRC-{self.pk:04d}"

    def __str__(self):
        return self.title


class Fact(models.Model):
    """A story element with an explicit reliability category."""

    class Category(models.TextChoices):
        VERIFIED = "verified", "Fait vérifié"
        TESTIMONY = "testimony", "Témoignage non vérifié"
        HYPOTHESIS = "hypothesis", "Hypothèse"
        FICTION = "fiction", "Élément fictif ajouté"

    class Treatment(models.TextChoices):
        STRICT = "strict", "Strictement historique"
        DRAMATIZABLE = "dramatizable", "Peut être dramatisé"

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="facts")
    statement = models.TextField("énoncé")
    category = models.CharField("catégorie", max_length=20, choices=Category)
    treatment = models.CharField("traitement", max_length=20, choices=Treatment, default=Treatment.STRICT)
    must_keep = models.BooleanField("à conserver absolument", default=False)
    event_date = models.CharField("date de l'événement", max_length=100, blank=True)
    chronology = models.PositiveIntegerField("ordre chronologique", default=0)
    place = models.CharField("lieu", max_length=200, blank=True)
    people = models.CharField("personnes concernées", max_length=300, blank=True)
    sources = models.ManyToManyField(Source, blank=True, related_name="facts", verbose_name="sources")
    notes = models.TextField("notes", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["chronology", "id"]
        verbose_name = "élément de l'histoire"

    @property
    def code(self):
        return f"FAC-{self.pk:04d}"

    def __str__(self):
        return self.statement[:80]


class Contradiction(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "À valider"
        RESOLVED = "resolved", "Résolue"

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="contradictions")
    description = models.TextField("description")
    facts = models.ManyToManyField(Fact, related_name="contradictions", verbose_name="éléments en conflit")
    status = models.CharField("statut", max_length=20, choices=Status, default=Status.OPEN)
    resolution = models.TextField("décision humaine", blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["status", "-created_at"]
        verbose_name = "contradiction"
