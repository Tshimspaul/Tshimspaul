from django.utils import timezone

from .models import FORMAT_DURATIONS, SeriesBible

REQUIRED = {
    "series_title": "le titre de la série",
    "genre": "le genre",
    "target_audience": "le public cible",
    "main_theme": "le thème principal",
    "synopsis": "le synopsis général",
    "main_conflict": "le conflit principal",
    "animation_style": "le style d'animation",
}


class BibleBlocked(Exception):
    def __init__(self, issues):
        super().__init__(" ".join(issues))
        self.issues = issues


def get_bible(project) -> SeriesBible:
    bible, created = SeriesBible.objects.get_or_create(
        project=project, defaults={"episode_format": project.episode_format}
    )
    if created:
        low, high = FORMAT_DURATIONS[bible.episode_format]
        bible.episode_duration_min = (low + high) // 2
        bible.save(update_fields=["episode_duration_min"])
    return bible


def issues(bible: SeriesBible) -> list[str]:
    from apps.stories.models import Story

    found = []
    story = Story.objects.filter(project=bible.project_id).first()
    if story is None or story.validated_at is None:
        found.append("La fiche de validation historique doit d'abord être validée.")
    for field, label in REQUIRED.items():
        if not str(getattr(bible, field)).strip():
            found.append(f"Renseignez {label}.")
    if bible.seasons < 1 or bible.episodes_per_season < 1:
        found.append("Il faut au moins une saison et un épisode par saison.")
    low, high = FORMAT_DURATIONS[bible.episode_format]
    if not low <= bible.episode_duration_min <= high:
        found.append(f"Pour ce format, la durée d'un épisode doit être entre {low} et {high} minutes.")
    return found


def validate(bible: SeriesBible) -> SeriesBible:
    found = issues(bible)
    if found:
        raise BibleBlocked(found)
    bible.validated_at = timezone.now()
    bible.save(update_fields=["validated_at", "updated_at"])
    return bible


def is_validated(project_id) -> bool:
    return SeriesBible.objects.filter(project_id=project_id, validated_at__isnull=False).exists()
