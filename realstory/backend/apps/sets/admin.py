from django.contrib import admin

from .models import Location, Prop

admin.site.register([Location, Prop])
