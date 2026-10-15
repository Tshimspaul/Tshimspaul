from django.contrib import admin

from .models import DialogueLine, Episode, Scene

admin.site.register([Episode, Scene, DialogueLine])
