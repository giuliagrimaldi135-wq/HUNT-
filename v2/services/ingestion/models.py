"""Shared ingestion models for HUNT 2.0."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class RawJob:
    source_name: str
    source_type: str
    company_name: str
    title: str
    listing_url: str
    apply_url: str | None = None
    external_job_id: str | None = None
    requisition_id: str | None = None
    location: str | None = None
    description: str | None = None
    published_at: datetime | None = None
    observed_at: datetime | None = None
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class CanonicalJobDraft:
    company_name: str
    canonical_title: str
    normalized_title: str
    role_family: str
    seniority: str
    city: str | None
    country_code: str | None
    employment_type: str | None
    requisition_id: str | None
    primary_apply_url: str | None
    description: str | None
    description_fingerprint: str
    source: RawJob
