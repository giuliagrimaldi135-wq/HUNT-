"""HUNT 2.0 deterministic vacancy deduplication v1."""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from urllib.parse import urlsplit, urlunsplit


def normalize_text(value: str | None) -> str:
    value = (value or "").lower()
    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"[^a-z0-9à-ÿ ]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def normalize_url(value: str | None) -> str:
    if not value:
        return ""
    p = urlsplit(value.strip())
    path = re.sub(r"/+$", "", p.path)
    return urlunsplit((p.scheme.lower(), p.netloc.lower(), path, "", ""))


def description_fingerprint(description: str | None) -> str:
    normalized = normalize_text(description)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest() if normalized else ""


@dataclass
class JobCandidate:
    company_key: str
    title: str
    location: str | None = None
    requisition_id: str | None = None
    external_job_id: str | None = None
    apply_url: str | None = None
    description: str | None = None


@dataclass
class DedupeDecision:
    same_job: bool
    confidence: float
    reason: str


def compare_jobs(a: JobCandidate, b: JobCandidate) -> DedupeDecision:
    if normalize_text(a.company_key) != normalize_text(b.company_key):
        return DedupeDecision(False, 1.0, "different_company")

    if a.requisition_id and b.requisition_id:
        if normalize_text(a.requisition_id) == normalize_text(b.requisition_id):
            return DedupeDecision(True, 1.0, "same_requisition_id")

    if a.apply_url and b.apply_url:
        if normalize_url(a.apply_url) == normalize_url(b.apply_url):
            return DedupeDecision(True, 0.99, "same_apply_url")

    if a.external_job_id and b.external_job_id:
        if normalize_text(a.external_job_id) == normalize_text(b.external_job_id):
            return DedupeDecision(True, 0.98, "same_external_job_id")

    title_similarity = SequenceMatcher(
        None, normalize_text(a.title), normalize_text(b.title)
    ).ratio()

    location_a = normalize_text(a.location)
    location_b = normalize_text(b.location)
    location_match = not location_a or not location_b or location_a == location_b

    desc_a = normalize_text(a.description)
    desc_b = normalize_text(b.description)
    description_similarity = (
        SequenceMatcher(None, desc_a[:12000], desc_b[:12000]).ratio()
        if desc_a and desc_b
        else 0.0
    )

    if location_match and title_similarity >= 0.92 and description_similarity >= 0.86:
        confidence = min(0.97, (title_similarity + description_similarity) / 2)
        return DedupeDecision(True, confidence, "same_company_title_location_description")

    return DedupeDecision(
        False,
        max(title_similarity, description_similarity),
        "insufficient_identity_evidence",
    )
