from django.contrib import admin

from .models import Contradiction, Fact, Source, Story

admin.site.register([Story, Source, Fact, Contradiction])
