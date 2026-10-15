from django.db import models


class Job(models.Model):
    """A unit of (possibly long, possibly paid) work attached to a project.

    Paid jobs are created in NEEDS_APPROVAL and can only run after an explicit
    user approval. See `apps.jobs.services` for the allowed transitions.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        RUNNING = "running", "En cours"
        COMPLETED = "completed", "Terminée"
        FAILED = "failed", "Échec"
        NEEDS_APPROVAL = "needs_approval", "Validation nécessaire"

    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="jobs", verbose_name="projet"
    )
    kind = models.CharField("type", max_length=64)
    label = models.CharField("libellé", max_length=200)
    status = models.CharField("statut", max_length=20, choices=Status, default=Status.PENDING)
    is_paid = models.BooleanField("payante", default=False)
    # Estimates are never guaranteed prices; the UI labels them as such.
    estimated_cost = models.DecimalField(
        "coût estimé", max_digits=10, decimal_places=4, null=True, blank=True
    )
    actual_cost = models.DecimalField("coût réel", max_digits=10, decimal_places=4, null=True, blank=True)
    params = models.JSONField("paramètres", default=dict, blank=True)
    result = models.JSONField("résultat", default=dict, blank=True)
    error = models.TextField("erreur", blank=True)
    attempts = models.PositiveIntegerField("tentatives", default=0)
    approved_at = models.DateTimeField("approuvée le", null=True, blank=True)
    started_at = models.DateTimeField("démarrée le", null=True, blank=True)
    finished_at = models.DateTimeField("terminée le", null=True, blank=True)
    created_at = models.DateTimeField("créée le", auto_now_add=True)
    updated_at = models.DateTimeField("modifiée le", auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "tâche"
        verbose_name_plural = "tâches"

    def __str__(self):
        return f"{self.label} ({self.get_status_display()})"
