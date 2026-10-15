from django.db import transaction
from rest_framework.exceptions import ValidationError


@transaction.atomic
def reorder(queryset, ids, field="order"):
    """Apply a new order to every item of `queryset`; `ids` must list them all exactly once."""
    try:
        ids = [int(i) for i in ids]
    except (TypeError, ValueError):
        raise ValidationError({"ids": "Liste d'identifiants invalide."})
    existing = set(queryset.values_list("pk", flat=True))
    if len(ids) != len(set(ids)) or set(ids) != existing:
        raise ValidationError({"ids": "La liste doit contenir chaque élément exactement une fois."})
    items = {o.pk: o for o in queryset.select_for_update()}
    for position, pk in enumerate(ids, start=1):
        setattr(items[pk], field, position)
    queryset.model.objects.bulk_update(items.values(), [field])


def next_order(queryset, field="order"):
    last = queryset.order_by(f"-{field}").values_list(field, flat=True).first()
    return (last or 0) + 1
