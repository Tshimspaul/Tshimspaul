from django.db import transaction
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.common.views import ProjectScopedViewSet

from .models import ReferenceImage
from .serializers import ReferenceImageSerializer


class ReferenceImageViewSet(ProjectScopedViewSet):
    serializer_class = ReferenceImageSerializer
    queryset = ReferenceImage.objects.select_related("character", "location", "prop")
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_fields = ("character", "location", "prop", "view")

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("current") == "1":
            qs = qs.filter(is_current=True)
        return qs

    @transaction.atomic
    def perform_destroy(self, instance):
        was_current = instance.is_current
        slot = instance.same_slot().exclude(pk=instance.pk)
        instance.image.delete(save=False)
        instance.delete()
        if was_current:
            previous = slot.order_by("-version").first()
            if previous:
                previous.is_current = True
                previous.save(update_fields=["is_current"])

    @action(detail=True, methods=["post"], url_path="make-current")
    @transaction.atomic
    def make_current(self, request, pk=None):
        """Go back to an earlier version without deleting the newer one."""
        ref = self.get_object()
        ref.same_slot().update(is_current=False)
        ref.is_current = True
        ref.save(update_fields=["is_current"])
        return Response(ReferenceImageSerializer(ref, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def replace(self, request, pk=None):
        """Upload a new version of this reference (same target, view and expression)."""
        ref = self.get_object()
        if "image" not in request.data:
            raise ValidationError({"image": "Choisissez une image."})
        data = {
            "project": ref.project_id,
            "character": ref.character_id,
            "location": ref.location_id,
            "prop": ref.prop_id,
            "view": ref.view,
            "expression": ref.expression,
            "image": request.data["image"],
            "notes": request.data.get("notes", ""),
        }
        ser = ReferenceImageSerializer(data={k: v for k, v in data.items() if v is not None}, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=201)
