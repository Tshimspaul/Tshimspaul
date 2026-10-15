from rest_framework import viewsets


class ProjectScopedViewSet(viewsets.ModelViewSet):
    """ModelViewSet filtered by `?project=<id>` (or another lookup via `project_lookup`)."""

    project_lookup = "project"
    filter_fields: tuple[str, ...] = ()

    def get_queryset(self):
        qs = super().get_queryset()
        project = self.request.query_params.get("project")
        if project:
            qs = qs.filter(**{self.project_lookup: project})
        for field in self.filter_fields:
            value = self.request.query_params.get(field)
            if value:
                qs = qs.filter(**{field: value})
        return qs
