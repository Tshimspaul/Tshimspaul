from rest_framework import serializers


def check_same_project(project_id, field: str, objs) -> None:
    """Reject related objects that belong to another project."""
    if objs is None:
        return
    if not isinstance(objs, list | tuple | set):
        objs = [objs]
    for obj in objs:
        if obj is not None and obj.project_id != project_id:
            raise serializers.ValidationError({field: "Cet élément appartient à un autre projet."})
