from django.utils import timezone

from .models import Contradiction, Fact, Story


class ValidationBlocked(Exception):
    def __init__(self, issues):
        super().__init__(" ".join(issues))
        self.issues = issues


def get_story(project) -> Story:
    story, _ = Story.objects.get_or_create(project=project)
    return story


def invalidate(project_id) -> None:
    """Any change to the story material requires a new human validation."""
    Story.objects.filter(project_id=project_id, validated_at__isnull=False).update(validated_at=None)


def validation_sheet(story: Story) -> dict:
    facts = list(story.project.facts.prefetch_related("sources"))
    open_contradictions = list(
        story.project.contradictions.filter(status=Contradiction.Status.OPEN).prefetch_related("facts")
    )
    issues = []
    if not story.summary.strip():
        issues.append("Le résumé de l'histoire est vide.")
    if not facts:
        issues.append("Aucun élément de l'histoire n'a été saisi.")
    unsourced = [f for f in facts if f.category == Fact.Category.VERIFIED and not f.sources.all()]
    for f in unsourced:
        issues.append(f"{f.code} est marqué « Fait vérifié » sans source.")
    if open_contradictions:
        issues.append(f"{len(open_contradictions)} contradiction(s) attendent une décision humaine.")

    by_category = {c: [] for c in Fact.Category.values}
    for f in facts:
        by_category[f.category].append(f)
    return {
        "facts_by_category": by_category,
        "open_contradictions": open_contradictions,
        "issues": issues,
        "can_validate": not issues,
    }


def validate(story: Story, note: str = "") -> Story:
    sheet = validation_sheet(story)
    if not sheet["can_validate"]:
        raise ValidationBlocked(sheet["issues"])
    story.validated_at = timezone.now()
    story.validation_note = note
    story.save(update_fields=["validated_at", "validation_note", "updated_at"])
    return story
