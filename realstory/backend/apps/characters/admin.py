from django.contrib import admin

from .models import Character, Relationship

admin.site.register([Character, Relationship])
