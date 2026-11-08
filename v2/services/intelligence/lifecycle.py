"""Evidence-driven vacancy lifecycle for HUNT 2.0."""
from __future__ import annotations

from dataclasses import dataclass

from intelligence.vacancy_confidence import ConfidenceResult, VacancySignals, calculate_vacancy_confidence


@dataclass
class LifecycleInput:
    signals: VacancySignals
    official_closed_explicitly: bool = False


@dataclass
class LifecycleResult:
    state: str
    confidence: ConfidenceResult


def determine_lifecycle(value: LifecycleInput) -> LifecycleResult:
    confidence = calculate_vacancy_confidence(value.signals)

    if value.official_closed_explicitly:
        return LifecycleResult("closed_verified", confidence)

    if value.signals.official_listing_present and value.signals.official_apply_works:
        return LifecycleResult("active_verified", confidence)

    if confidence.label == "LIKELY ACTIVE":
        return LifecycleResult("active_likely", confidence)

    if confidence.label == "POSSIBLE EVERGREEN / TALENT POOL":
        return LifecycleResult("evergreen_possible", confidence)

    if confidence.label == "STALE / CLOSED":
        return LifecycleResult("stale_possible", confidence)

    return LifecycleResult("unknown", confidence)
