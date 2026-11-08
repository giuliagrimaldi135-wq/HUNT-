"""HUNT 2.0 vacancy-confidence engine v1.

This module is deliberately explainable. It does not label jobs as "fake".
It scores the strength of evidence that a vacancy is currently actionable.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable


@dataclass(frozen=True)
class Evidence:
    code: str
    weight: int
    message: str


@dataclass
class VacancySignals:
    official_listing_present: bool = False
    official_apply_works: bool = False
    requisition_id_present: bool = False
    verified_at: datetime | None = None
    published_at: datetime | None = None
    trustworthy_source_count: int = 0
    official_listing_missing: bool = False
    apply_link_dead: bool = False
    only_aggregator_sources: bool = False
    explicit_talent_pool_language: bool = False
    repeated_identical_reposts: int = 0
    listing_age_days: float | None = None


@dataclass
class ConfidenceResult:
    score: int
    label: str
    evidence: list[Evidence] = field(default_factory=list)


def _days_since(value: datetime | None) -> float | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - value.astimezone(timezone.utc)).total_seconds() / 86400


def calculate_vacancy_confidence(s: VacancySignals) -> ConfidenceResult:
    evidence: list[Evidence] = []
    score = 35  # neutral discovery baseline

    def add(code: str, weight: int, message: str) -> None:
        nonlocal score
        score += weight
        evidence.append(Evidence(code, weight, message))

    if s.official_listing_present:
        add("official_present", 25, "The role is currently present on an official company/ATS source.")

    if s.official_apply_works:
        add("official_apply_active", 20, "The official application flow is currently reachable.")

    if s.requisition_id_present:
        add("requisition_id", 8, "A specific requisition/job ID is present.")

    verified_age = _days_since(s.verified_at)
    if verified_age is not None:
        if verified_age <= 1:
            add("verified_24h", 8, "The vacancy was verified within the last 24 hours.")
        elif verified_age <= 7:
            add("verified_7d", 5, "The vacancy was verified within the last 7 days.")
        elif verified_age > 30:
            add("verification_old", -10, "The vacancy has not been verified recently.")

    if s.trustworthy_source_count >= 2:
        add("source_agreement", 5, "At least two trustworthy sources currently agree on the vacancy.")

    age = s.listing_age_days
    if age is None:
        age = _days_since(s.published_at)

    if age is not None:
        if age <= 7:
            add("fresh_listing", 6, "The listing is recent.")
        elif age > 60:
            add("old_listing", -12, "The listing is older than 60 days.")
        elif age > 30:
            add("aging_listing", -6, "The listing is older than 30 days.")

    if s.official_listing_missing:
        add("official_missing", -24, "The role is no longer visible on the official source.")

    if s.apply_link_dead:
        add("apply_dead", -30, "The application link is not currently actionable.")

    if s.only_aggregator_sources:
        add("aggregator_only", -18, "Only aggregator/job-board copies are currently visible.")

    if s.explicit_talent_pool_language:
        add("talent_pool", -18, "The listing contains talent-pool/future-opportunity language.")

    if s.repeated_identical_reposts >= 5:
        add("many_identical_reposts", -15, "The same listing pattern has been reposted many times.")
    elif s.repeated_identical_reposts >= 3:
        add("repeated_reposts", -8, "The same listing pattern has been reposted repeatedly.")

    score = max(0, min(100, score))

    if score >= 80:
        label = "VERIFIED ACTIVE"
    elif score >= 60:
        label = "LIKELY ACTIVE"
    elif score >= 40:
        label = "INSUFFICIENT EVIDENCE"
    elif s.explicit_talent_pool_language or s.repeated_identical_reposts >= 3:
        label = "POSSIBLE EVERGREEN / TALENT POOL"
    else:
        label = "STALE / CLOSED"

    return ConfidenceResult(score=score, label=label, evidence=evidence)
