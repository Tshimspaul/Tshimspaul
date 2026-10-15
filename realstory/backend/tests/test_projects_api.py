import pytest

from apps.projects.models import Project

pytestmark = pytest.mark.django_db


def test_create_list_update_delete_project(api):
    r = api.post(
        "/api/projects/",
        {"title": "  Mémoires du fleuve ", "episode_format": "short", "aspect_ratio": "9:16"},
        format="json",
    )
    assert r.status_code == 201, r.data
    pid = r.data["id"]
    assert r.data["title"] == "Mémoires du fleuve"
    assert r.data["status"] == "draft"
    assert r.data["status_label"] == "Brouillon"
    assert r.data["episode_format_label"] == "Format court (3 à 5 min)"

    r = api.get("/api/projects/")
    assert [p["id"] for p in r.data["results"]] == [pid]

    r = api.patch(f"/api/projects/{pid}/", {"status": "archived"}, format="json")
    assert r.status_code == 200
    assert api.get("/api/projects/?status=archived").data["count"] == 1
    assert api.get("/api/projects/?status=draft").data["count"] == 0

    assert api.delete(f"/api/projects/{pid}/").status_code == 204
    assert not Project.objects.exists()


@pytest.mark.parametrize(
    "payload,field",
    [
        ({"title": "   "}, "title"),
        ({"title": "X", "budget_limit": "-1"}, "budget_limit"),
        ({"title": "X", "aspect_ratio": "4:3"}, "aspect_ratio"),
    ],
)
def test_project_validation(api, payload, field):
    r = api.post("/api/projects/", payload, format="json")
    assert r.status_code == 400
    assert field in r.data


def test_dashboard_counts(api, project, fake_kinds, run_on_commit):
    Project.objects.create(title="Archivé", status="archived")
    with run_on_commit():
        api.post("/api/jobs/", {"project": project.pk, "kind": "test_free"}, format="json")
    api.post("/api/jobs/", {"project": project.pk, "kind": "test_paid"}, format="json")

    r = api.get("/api/dashboard/")
    assert r.status_code == 200
    assert r.data["projects"]["total"] == 2
    assert r.data["projects"]["by_status"]["archived"] == 1
    assert r.data["jobs"]["completed"] == 1
    assert r.data["jobs"]["needs_approval"] == 1
    assert r.data["jobs"]["failed"] == 0
    assert [p["title"] for p in r.data["recent_projects"]] == ["La traversée"]
    assert len(r.data["recent_jobs"]) == 2
