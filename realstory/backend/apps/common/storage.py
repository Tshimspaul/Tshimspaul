import os

from django.utils.deconstruct import deconstructible
from django.utils.text import get_valid_filename


@deconstructible
class ProjectUploadTo:
    """Store uploads under projects/<project_id>/<subfolder>/."""

    def __init__(self, subfolder: str):
        self.subfolder = subfolder

    def __call__(self, instance, filename):
        name = get_valid_filename(os.path.basename(filename))
        return f"projects/{instance.project_id}/{self.subfolder}/{name}"

    def __eq__(self, other):
        return isinstance(other, ProjectUploadTo) and other.subfolder == self.subfolder


def project_upload_to(subfolder: str) -> ProjectUploadTo:
    return ProjectUploadTo(subfolder)
