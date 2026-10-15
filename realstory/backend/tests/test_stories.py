import pytest

from apps.projects.models import Project
from apps.stories.models import Story

pytestmark = pytest.mark.django_db


@pytest.fixture
def project():
    return Project.objects.create(title="Mémoires")


def post(api, url, data):
    r = api.post(url, data, format="json")
    assert r.status_code in (200, 201), r.data
    return r.data


def test_story_is_created_on_first_access_and_editable(api, project):
    r = api.get(f"/api/stories/{project.pk}/")
    assert r.status_code == 200 and r.data["summary"] == ""
    r = api.patch(f"/api/stories/{project.pk}/", {"summary": "Un récit", "period": "1958-1962"}, format="json")
    assert r.data["period"] == "1958-1962"
    assert Story.objects.count() == 1


def test_verified_fact_requires_a_source(api, project):
    r = api.post("/api/facts/", {"project": project.pk, "statement": "X", "category": "verified"}, format="json")
    assert r.status_code == 400 and "sources" in r.data
    src = post(api, "/api/sources/", {"project": project.pk, "title": "Journal officiel", "kind": "archive"})
    fact = post(api, "/api/facts/", {"project": project.pk, "statement": "X", "category": "verified", "sources": [src["id"]]})
    assert fact["category_label"] == "Fait vérifié"
    assert fact["code"].startswith("FAC-")
    # Removing the only source of a verified fact is refused.
    r = api.patch(f"/api/facts/{fact['id']}/", {"sources": []}, format="json")
    assert r.status_code == 400


def test_sources_from_another_project_are_rejected(api, project):
    other = Project.objects.create(title="Autre")
    src = post(api, "/api/sources/", {"project": other.pk, "title": "Ailleurs"})
    r = api.post(
        "/api/facts/", {"project": project.pk, "statement": "X", "category": "testimony", "sources": [src["id"]]}, format="json"
    )
    assert r.status_code == 400


def test_fiction_is_never_strictly_historical(api, project):
    fact = post(api, "/api/facts/", {"project": project.pk, "statement": "Scène inventée", "category": "fiction"})
    assert fact["treatment"] == "dramatizable"


def test_contradiction_blocks_validation_until_human_decision(api, project):
    api.patch(f"/api/stories/{project.pk}/", {"summary": "Résumé"}, format="json")
    a = post(api, "/api/facts/", {"project": project.pk, "statement": "Départ en mars", "category": "testimony"})
    b = post(api, "/api/facts/", {"project": project.pk, "statement": "Départ en mai", "category": "testimony"})

    r = api.post("/api/contradictions/", {"project": project.pk, "description": "Date", "facts": [a["id"]]}, format="json")
    assert r.status_code == 400  # needs two facts
    c = post(api, "/api/contradictions/", {"project": project.pk, "description": "Date du départ", "facts": [a["id"], b["id"]]})
    assert c["status"] == "open"

    sheet = api.get(f"/api/stories/{project.pk}/validation-sheet/").data
    assert not sheet["can_validate"]
    assert any("contradiction" in i for i in sheet["issues"])
    assert len(sheet["facts_by_category"]["testimony"]) == 2
    r = api.post(f"/api/stories/{project.pk}/validate/", {}, format="json")
    assert r.status_code == 400

    assert api.post(f"/api/contradictions/{c['id']}/resolve/", {"resolution": "  "}, format="json").status_code == 400
    r = post(api, f"/api/contradictions/{c['id']}/resolve/", {"resolution": "Mars, selon deux témoins concordants."})
    assert r["status"] == "resolved"

    r = post(api, f"/api/stories/{project.pk}/validate/", {"note": "Relu par l'historien"})
    assert r["validated_at"] is not None


def test_any_change_clears_validation(api, project):
    api.patch(f"/api/stories/{project.pk}/", {"summary": "Résumé"}, format="json")
    post(api, "/api/facts/", {"project": project.pk, "statement": "A", "category": "hypothesis"})
    post(api, f"/api/stories/{project.pk}/validate/", {})
    post(api, "/api/facts/", {"project": project.pk, "statement": "B", "category": "fiction"})
    assert api.get(f"/api/stories/{project.pk}/").data["validated_at"] is None


def test_validation_sheet_flags_verified_fact_whose_source_was_deleted(api, project):
    api.patch(f"/api/stories/{project.pk}/", {"summary": "Résumé"}, format="json")
    src = post(api, "/api/sources/", {"project": project.pk, "title": "Lettre"})
    post(api, "/api/facts/", {"project": project.pk, "statement": "A", "category": "verified", "sources": [src["id"]]})
    api.delete(f"/api/sources/{src['id']}/")
    sheet = api.get(f"/api/stories/{project.pk}/validation-sheet/").data
    assert any("sans source" in i for i in sheet["issues"])


def test_source_upload_is_stored_under_the_project(api, project, settings):
    from django.core.files.uploadedfile import SimpleUploadedFile

    f = SimpleUploadedFile("lettre de 1960.pdf", b"%PDF-1.4", content_type="application/pdf")
    r = api.post("/api/sources/", {"project": project.pk, "title": "Lettre", "file": f}, format="multipart")
    assert r.status_code == 201, r.data
    assert f"/projects/{project.pk}/sources/" in r.data["file"]


def test_empty_story_cannot_be_validated(api, project):
    sheet = api.get(f"/api/stories/{project.pk}/validation-sheet/").data
    assert set(sheet["issues"]) >= {"Le résumé de l'histoire est vide.", "Aucun élément de l'histoire n'a été saisi."}
