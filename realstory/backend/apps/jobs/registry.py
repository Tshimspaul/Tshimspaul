"""Registry of job kinds.

Each app registers the kinds of work it knows how to perform. Whether a kind
is paid, and how its cost is estimated, is decided here on the server, never
by the client.
"""

from collections.abc import Callable
from dataclasses import dataclass
from decimal import Decimal
from typing import Any


@dataclass(frozen=True)
class JobKind:
    key: str
    label: str
    handler: Callable[[Any], dict]
    is_paid: bool = False
    # Returns an estimate in the project's currency, or None when unknown.
    estimate_cost: Callable[[dict], Decimal | None] | None = None


_REGISTRY: dict[str, JobKind] = {}


def register(kind: JobKind) -> None:
    _REGISTRY[kind.key] = kind


def unregister(key: str) -> None:
    _REGISTRY.pop(key, None)


def get_kind(key: str) -> JobKind:
    return _REGISTRY[key]


def all_kinds() -> list[JobKind]:
    return list(_REGISTRY.values())
