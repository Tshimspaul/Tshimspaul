import pytest

from apps.projects.models import Project

from .factories import character, png, validated_project

pytestmark = pytest.mark.django_db


def test_bible_requires_validated_story_and_required_fields(api):
    project = Project.objects.create(title="P", episode_format="short")
    bible = api.get(f"/api/bibles/{project.pk}/").data
    assert bible["episode_format"] == "short" and bible["episode_duration_min"] == 4
    assert any("validation historique" in i for i in bible["issues"])
    r = api.post(f"/api/bibles/{project.pk}/validate/")
    assert r.status_code == 400


def test_bible_duration_must_match_format_and_edit_resets_validation(api):
    project = validated_project()
    r = api.patch(f"/api/bibles/{project.pk}/", {"episode_format": "short", "episode_duration_min": 12}, format="json")
    assert any("entre 3 et 5" in i for i in r.data["issues"])
    assert r.data["validated_at"] is None  # edits send the bible back to draft
    r = api.patch(f"/api/bibles/{project.pk}/", {"episode_duration_min": 4}, format="json")
    assert r.data["issues"] == []
    assert api.post(f"/api/bibles/{project.pk}/validate/").data["validated_at"] is not None


def test_bible_palette_validation(api):
    project = validated_project()
    bad = api.patch(f"/api/bibles/{project.pk}/", {"color_palette": [{"name": "Ocre", "hex": "ocre"}]}, format="json")
    assert bad.status_code == 400
    ok = api.patch(f"/api/bibles/{project.pk}/", {"color_palette": [{"name": "Ocre", "hex": "#C8812E"}]}, format="json")
    assert ok.data["color_palette"] == [{"name": "Ocre", "hex": "#C8812E"}]


def test_formats_endpoint(api):
    formats = {f["key"]: (f["min"], f["max"]) for f in api.get("/api/bibles/formats/").data}
    assert formats == {"short": (3, 5), "medium": (8, 12), "long": (20, 30)}


def test_character_sheet_and_continuity(api):
    project = validated_project()
    r = api.post(
        "/api/characters/",
        {"project": project.pk, "name": "Awa", "role": "main", "is_real_person": True, "documented_details": "Née en 1941"},
        format="json",
    )
    assert r.status_code == 201, r.data
    c = r.data
    assert c["code"] == f"CHR-{c['id']:04d}"
    assert c["continuity"]["missing_views"] == ["face", "profile", "three_quarter"]
    assert not c["continuity"]["complete"]

    for view in ("face", "profile", "three_quarter"):
        r = api.post("/api/references/", {"project": project.pk, "character": c["id"], "view": view, "image": png()}, format="multipart")
        assert r.status_code == 201, r.data
    for expr in ("joie", "colère", "peur"):
        api.post(
            "/api/references/",
            {"project": project.pk, "character": c["id"], "view": "expression", "expression": expr, "image": png()},
            format="multipart",
        )
    api.patch(f"/api/characters/{c['id']}/", {"locked_description": "Femme de 19 ans, foulard indigo"}, format="json")
    cont = api.get(f"/api/characters/{c['id']}/").data["continuity"]
    assert cont["complete"], cont
    assert cont["expressions"] == ["colère", "joie", "peur"]


def test_reference_versions_and_rollback(api, settings):
    project = validated_project()
    c = character(project)
    first = api.post("/api/references/", {"project": project.pk, "character": c.pk, "view": "face", "image": png()}, format="multipart").data
    second = api.post(f"/api/references/{first['id']}/replace/", {"image": png("v2.png")}, format="multipart")
    assert second.status_code == 201, second.data
    assert second.data["version"] == 2 and second.data["is_current"]
    refs = api.get(f"/api/references/?character={c.pk}").data["results"]
    assert {(r["version"], r["is_current"]) for r in refs} == {(1, False), (2, True)}
    assert (settings.MEDIA_ROOT / f"projects/{project.pk}/references").is_dir()

    api.post(f"/api/references/{first['id']}/make-current/")
    current = api.get(f"/api/references/?character={c.pk}&current=1").data["results"]
    assert [r["version"] for r in current] == [1]

    # Deleting the current version restores the latest remaining one.
    api.delete(f"/api/references/{first['id']}/")
    current = api.get(f"/api/references/?character={c.pk}&current=1").data["results"]
    assert [r["version"] for r in current] == [2]


def test_reference_rules(api):
    project = validated_project()
    c = character(project)
    r = api.post("/api/references/", {"project": project.pk, "view": "face", "image": png()}, format="multipart")
    assert r.status_code == 400  # no target
    r = api.post("/api/references/", {"project": project.pk, "character": c.pk, "view": "expression", "image": png()}, format="multipart")
    assert r.status_code == 400 and "expression" in r.data
    r = api.post(
        "/api/references/",
        {"project": project.pk, "character": c.pk, "view": "face", "image": png("x.txt")},
        format="multipart",
    )
    assert r.status_code == 400 and "image" in r.data  # non-image extension
    from django.core.files.uploadedfile import SimpleUploadedFile

    bad = SimpleUploadedFile("x.png", b"not an image", content_type="image/png")
    r = api.post("/api/references/", {"project": project.pk, "character": c.pk, "view": "face", "image": bad}, format="multipart")
    assert r.status_code == 400 and "image" in r.data


def test_relationships_and_sets(api):
    project = validated_project()
    a, b = character(project, "Awa"), character(project, "Moussa")
    r = api.post("/api/relationships/", {"project": project.pk, "source": a.pk, "target": a.pk, "kind": "sœur"}, format="json")
    assert r.status_code == 400
    r = api.post("/api/relationships/", {"project": project.pk, "source": a.pk, "target": b.pk, "kind": "frère"}, format="json")
    assert r.data["target_name"] == "Moussa"

    loc = api.post("/api/locations/", {"project": project.pk, "name": "Port de Dakar", "is_real_place": True}, format="json").data
    assert loc["code"].startswith("LOC-")
    prop = api.post("/api/props/", {"project": project.pk, "name": "Valise", "owner": a.pk}, format="json").data
    assert prop["code"].startswith("PRP-") and prop["owner_name"] == "Awa"

    other = Project.objects.create(title="Autre")
    r = api.post("/api/props/", {"project": other.pk, "name": "Valise", "owner": a.pk}, format="json")
    assert r.status_code == 400
