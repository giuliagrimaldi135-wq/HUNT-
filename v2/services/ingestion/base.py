"""Base contract for every HUNT 2.0 job source."""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterable

from .models import RawJob


class SourceAdapter(ABC):
    source_name: str
    source_type: str

    @abstractmethod
    def discover(self) -> Iterable[RawJob]:
        """Return raw public job listings currently visible on this source."""
        raise NotImplementedError

    def healthcheck(self) -> tuple[bool, str]:
        """Adapters can override with a lightweight source check."""
        return True, "not_implemented"
