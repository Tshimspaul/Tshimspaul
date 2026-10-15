import pytest

from apps.projects.models import Project
from apps.stories.models import Fact, Source

from .factories import character, validated_project

pytestmark = pytest.mark.django_db


def make_episode(api, project, number=1):
    r = api.post("/api/episodes/", {"project": project.pk, "number": number, "title": f"Épisode {number}"}, format="json")
    assert r.status_code == 201, r.data
    return r.data


def make_scene(api, episode, heading, **extra):
    r = api.post("/api/scenes/", {"episode": episode["id"], "heading": heading, **extra}, format="json")
    assert r.status_code == 201, r.data
    return r.data


def test_episodes_need_a_validated_bible(api):
    project = Project.objects.create(title="Sans bible")
    r = api.post("/api/episodes/", {"project": project.pk, "number": 1, "title": "Pilote"}, format="json")
    assert r.status_code == 400 and "bible" in str(r.data)


def test_episode_numbers_are_unique_per_season(api):
    project = validated_project()
    ep = make_episode(api, project)
    assert ep["code"] == "S01E01"
    r = api.post("/api/episodes/", {"project": project.pk, "number": 1, "title": "Doublon"}, format="json")
    assert r.status_code == 400 and "existe déjà" in str(r.data)
    r = api.post("/api/episodes/", {"project": project.pk, "season": 2, "number": 1, "title": "Saison 2"}, format="json")
    assert r.status_code == 201


def test_dialogue_labels(api):
    project = validated_project()
    ep = make_episode(api, project)
    scene = make_scene(api, ep, "Le quai")
    real = character(project, "Awa", real=True)
    fictional = character(project, "Le douanier")
    src = Source.objects.create(project=project, title="Entretien enregistré", kind="testimony")

    def line(**data):
        return api.post("/api/lines/", {"scene": scene["id"], "text": "…", **data}, format="json")

    r = line(character=fictional.pk, kind="reconstructed")
    assert r.data["kind"] == "fiction"
    r = line(character=fictional.pk, kind="authentic", source=src.pk)
    assert r.status_code == 400
    r = line(character=real.pk)
    assert r.data["kind"] == "reconstructed" and r.data["kind_label"] == "Dialogue reconstitué"
    r = line(character=real.pk, kind="fiction")
    assert r.data["kind"] == "reconstructed"
    r = line(character=real.pk, kind="authentic")
    assert r.status_code == 400 and "source" in r.data
    r = line(character=real.pk, kind="authentic", source=src.pk)
    assert r.status_code == 201 and r.data["source"] == src.pk

    full = api.get(f"/api/episodes/{ep['id']}/full/").data
    assert [l["order"] for l in full["scenes"][0]["lines"]] == [1, 2, 3, 4]
    assert set(full["scenes"][0]["characters"]) == {real.pk, fictional.pk}


def test_scene_reorder_and_durations(api):
    project = validated_project()
    ep = make_episode(api, project)
    a = make_scene(api, ep, "A", estimated_duration_s=60)
    b = make_scene(api, ep, "B", estimated_duration_s=90)
    c = make_scene(api, ep, "C", estimated_duration_s=30)
    assert api.post(f"/api/episodes/{ep['id']}/reorder-scenes/", {"ids": [c["id"], a["id"]]}, format="json").status_code == 400
    r = api.post(f"/api/episodes/{ep['id']}/reorder-scenes/", {"ids": [c["id"], a["id"], b["id"]]}, format="json")
    assert r.status_code == 200
    full = api.get(f"/api/episodes/{ep['id']}/full/").data
    assert [s["heading"] for s in full["scenes"]] == ["C", "A", "B"]
    assert full["episode"]["duration_s"] == 180
    assert full["target_duration_s"] == 10 * 60


def test_chronology_warning_unless_flashback(api):
    project = validated_project()
    early = Fact.objects.create(project=project, statement="1958", category="hypothesis", chronology=1)
    late = Fact.objects.create(project=project, statement="1962", category="hypothesis", chronology=5)
    ep = make_episode(api, project)
    make_scene(api, ep, "Arrivée", facts=[late.pk])
    back = make_scene(api, ep, "Souvenir", facts=[early.pk])
    assert len(api.get(f"/api/episodes/{ep['id']}/full/").data["warnings"]) == 1
    api.patch(f"/api/scenes/{back['id']}/", {"is_flashback": True}, format="json")
    assert api.get(f"/api/episodes/{ep['id']}/full/").data["warnings"] == []


def test_shots_have_stable_codes_and_reorder(api):
    project = validated_project()
    awa = character(project, "Awa")
    ep = make_episode(api, project)
    scene = make_scene(api, ep, "Le quai")
    shots = []
    for desc, kind in [("Vue du port", "wide"), ("Visage d'Awa", "close_up"), ("Sa main", "extreme_close_up")]:
        r = api.post(
            "/api/shots/",
            {"scene": scene["id"], "description": desc, "shot_type": kind, "main_character": awa.pk, "duration_s": "2.5"},
            format="json",
        )
        assert r.status_code == 201, r.data
        shots.append(r.data)
    assert shots[1]["shot_type_label"] == "Gros plan"
    codes = {s["id"]: s["code"] for s in shots}

    ids = [shots[2]["id"], shots[0]["id"], shots[1]["id"]]
    assert api.post(f"/api/scenes/{scene['id']}/reorder-shots/", {"ids": ids}, format="json").status_code == 200
    listed = api.get(f"/api/shots/?scene={scene['id']}").data["results"]
    assert [s["id"] for s in listed] == ids
    assert all(codes[s["id"]] == s["code"] for s in listed)  # codes survive reordering

    r = api.post("/api/shots/", {"scene": scene["id"], "description": "x", "duration_s": "0"}, format="json")
    assert r.status_code == 400


def test_project_filtering_isolates_projects(api):
    p1, p2 = validated_project("Un"), validated_project("Deux")
    make_episode(api, p1)
    character(p2, "Ailleurs")
    assert api.get(f"/api/episodes/?project={p2.pk}").data["count"] == 0
    assert api.get(f"/api/characters/?project={p1.pk}").data["count"] == 0
    loc = api.post("/api/locations/", {"project": p2.pk, "name": "Ailleurs"}, format="json").data
    ep = api.get(f"/api/episodes/?project={p1.pk}").data["results"][0]
    r = api.post("/api/scenes/", {"episode": ep["id"], "heading": "X", "location": loc["id"]}, format="json")
    assert r.status_code == 400
