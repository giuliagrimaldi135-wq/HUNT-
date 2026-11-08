"""Normalization/classification for HUNT 2.0 canonical jobs."""
from __future__ import annotations

import re

from .models import CanonicalJobDraft, RawJob
from ..intelligence.dedupe import description_fingerprint, normalize_text


ROLE_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("Retail Merchandising", ("retail merchandising", "merchandis")),
    ("Buying", ("buying", "buyer")),
    ("Planning & Allocation", ("retail planning", "merchandise planning", "allocation", "planner")),
    ("Product", ("product development", "product intern", "product assistant", "collection")),
    ("Wholesale", ("wholesale", "showroom", "sales campaign")),
    ("E-commerce", ("e-commerce", "ecommerce", "digital merchandising", "catalogue")),
    ("Retail Performance", ("retail performance", "retail excellence")),
    ("Trade Marketing", ("trade marketing",)),
    ("Retail Operations", ("retail operations", "area management")),
    ("Visual Merchandising", ("visual merchandising", "visual merchandis")),
]

SENIOR_TERMS = ("senior", "manager", "director", "head of", "lead", "principal", "chief")
JUNIOR_TERMS = ("intern", "internship", "stage", "trainee", "graduate", "assistant", "junior")

CITY_RULES: list[tuple[str, tuple[str, ...], str]] = [
    ("Milano", ("milano", "milan"), "IT"),
    ("Firenze", ("firenze", "florence", "scandicci"), "IT"),
    ("Roma", ("roma", "rome"), "IT"),
    ("Arezzo", ("arezzo", "valvigna", "terranuova bracciolini"), "IT"),
    ("Torino", ("torino", "turin"), "IT"),
    ("Bologna", ("bologna",), "IT"),
    ("Venezia", ("venezia", "venice"), "IT"),
    ("London", ("london", "londra"), "GB"),
    ("Zurich", ("zurich", "zürich"), "CH"),
    ("Geneva", ("geneva", "genève", "ginevra"), "CH"),
    ("Lugano", ("lugano",), "CH"),
]


def classify_role(title: str, description: str | None = None) -> str:
    haystack = normalize_text(f"{title} {description or ''}")
    for family, needles in ROLE_RULES:
        if any(normalize_text(n) in haystack for n in needles):
            return family
    return "Other"


def classify_seniority(title: str, description: str | None = None) -> str:
    title_n = normalize_text(title)
    text_n = normalize_text(f"{title} {description or ''}")

    if any(term in title_n for term in JUNIOR_TERMS):
        return "entry"
    if any(term in title_n for term in SENIOR_TERMS):
        return "senior"

    years = []
    for match in re.finditer(r"\b(\d+)\s*(?:\+|plus)?\s*(?:years?|anni)\b", text_n):
        try:
            years.append(int(match.group(1)))
        except ValueError:
            pass
    if years:
        minimum = min(years)
        if minimum <= 1:
            return "entry"
        if minimum <= 3:
            return "early_career"
        return "experienced"
    return "unknown"


def normalize_location(location: str | None) -> tuple[str | None, str | None]:
    value = normalize_text(location)
    if not value:
        return None, None
    for city, needles, country in CITY_RULES:
        if any(normalize_text(n) in value for n in needles):
            return city, country

    if any(x in value for x in ("italy", "italia")):
        return None, "IT"
    if any(x in value for x in ("switzerland", "svizzera")):
        return None, "CH"
    if any(x in value for x in ("united kingdom", "uk")):
        return None, "GB"
    return location.strip(), None


def classify_employment(title: str, description: str | None = None) -> str | None:
    text = normalize_text(f"{title} {description or ''}")
    if any(x in text for x in ("internship", "intern", "stage", "trainee")):
        return "internship"
    if "part time" in text:
        return "part_time"
    if any(x in text for x in ("fixed term", "tempo determinato")):
        return "fixed_term"
    if any(x in text for x in ("full time", "permanent", "tempo indeterminato")):
        return "full_time"
    return None


def canonicalize(raw: RawJob) -> CanonicalJobDraft:
    city, country = normalize_location(raw.location)
    title = re.sub(r"\s+", " ", raw.title).strip()
    return CanonicalJobDraft(
        company_name=raw.company_name.strip(),
        canonical_title=title,
        normalized_title=normalize_text(title),
        role_family=classify_role(title, raw.description),
        seniority=classify_seniority(title, raw.description),
        city=city,
        country_code=country,
        employment_type=classify_employment(title, raw.description),
        requisition_id=raw.requisition_id,
        primary_apply_url=raw.apply_url or raw.listing_url,
        description=raw.description,
        description_fingerprint=description_fingerprint(raw.description),
        source=raw,
    )
