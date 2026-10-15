import io
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.bible.services import get_bible
from apps.characters.models import Character
from apps.projects.models import Project
from apps.stories.models import Fact, Source
from apps.stories.services import get_story


def png(name="ref.png", color=(200, 80, 40)):
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), color).save(buf, "PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


def validated_project(title="La traversée"):
    """A project whose story and bible are both validated."""
    project = Project.objects.create(title=title, budget_limit=Decimal("10"))
    story = get_story(project)
    story.summary = "Résumé"
    story.save()
    src = Source.objects.create(project=project, title="Archives")
    fact = Fact.objects.create(project=project, statement="Départ du convoi", category="verified")
    fact.sources.add(src)
    from apps.stories.services import validate

    validate(story)
    bible = get_bible(project)
    for field in ("series_title", "genre", "target_audience", "main_theme", "synopsis", "main_conflict", "animation_style"):
        setattr(bible, field, "x")
    bible.save()
    from apps.bible.services import validate as validate_bible

    validate_bible(bible)
    return project


def character(project, name="Awa", real=False):
    return Character.objects.create(project=project, name=name, is_real_person=real)
