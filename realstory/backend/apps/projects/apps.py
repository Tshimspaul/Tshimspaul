from django.apps import AppConfig


class ProjectsConfig(AppConfig):
    name = "apps.projects"
    verbose_name = "Projets"

    def ready(self):
        from .handlers import register_handlers

        register_handlers()
