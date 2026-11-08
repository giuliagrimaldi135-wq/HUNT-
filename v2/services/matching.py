"""HUNT 2.0 personal matching engine v1.

Pure deterministic baseline. Later semantic/LLM signals can enrich it, but explicit
user preferences must always remain authoritative.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class UserCareerProfile:
    primary_roles: set[str] = field(default_factory=set)
    secondary_roles: set[str] = field(default_factory=set)
    excluded_roles: set[str] = field(default_factory=set)
    preferred_cities: set[str] = field(default_factory=set)
    relocation_cities: set[str] = field(default_factory=set)
    preferred_brands: set[str] = field(default_factory=set)
    excluded_brands: set[str] = field(default_factory=set)
    skills: set[str] = field(default_factory=set)
    seniority: str = "entry"


@dataclass
class MatchableJob:
    brand: str
    role_family: str
    city: str | None
    seniority: str
    required_skills: set[str] = field(default_factory=set)


@dataclass
class MatchResult:
    score: int
    reasons: list[str]
    gaps: list[str]
    hard_excluded: bool = False


def _norm_set(values: set[str]) -> set[str]:
    return {x.strip().lower() for x in values if x and x.strip()}


def calculate_match(profile: UserCareerProfile, job: MatchableJob) -> MatchResult:
    primary = _norm_set(profile.primary_roles)
    secondary = _norm_set(profile.secondary_roles)
    excluded = _norm_set(profile.excluded_roles)
    preferred_cities = _norm_set(profile.preferred_cities)
    relocation_cities = _norm_set(profile.relocation_cities)
    preferred_brands = _norm_set(profile.preferred_brands)
    excluded_brands = _norm_set(profile.excluded_brands)
    user_skills = _norm_set(profile.skills)

    role = (job.role_family or "").strip().lower()
    brand = (job.brand or "").strip().lower()
    city = (job.city or "").strip().lower()

    if role in excluded:
        return MatchResult(0, [], ["Role family explicitly excluded by user."], True)
    if brand in excluded_brands:
        return MatchResult(0, [], ["Brand explicitly excluded by user."], True)

    score = 20
    reasons: list[str] = []
    gaps: list[str] = []

    if role in primary:
        score += 35
        reasons.append("Primary career-target match.")
    elif role in secondary:
        score += 22
        reasons.append("Secondary career-target match.")
    else:
        gaps.append("Role family is outside the user's stated targets.")

    if job.seniority == profile.seniority:
        score += 15
        reasons.append("Seniority matches the user's target level.")
    elif profile.seniority == "entry" and job.seniority in {"entry", "early_career", "unknown"}:
        score += 10
        reasons.append("Seniority is compatible with an entry-level profile.")
    elif profile.seniority == "entry" and job.seniority in {"experienced", "senior"}:
        score -= 25
        gaps.append("Role appears more senior than the user's target.")

    if city:
        if city in preferred_cities:
            score += 12
            reasons.append("Preferred location.")
        elif city in relocation_cities:
            score += 6
            reasons.append("Location accepted for relocation.")
        elif preferred_cities:
            score -= 6
            gaps.append("Location is outside the user's preferred cities.")

    if brand in preferred_brands:
        score += 5
        reasons.append("Preferred brand.")

    required = _norm_set(job.required_skills)
    if required:
        overlap = required & user_skills
        ratio = len(overlap) / len(required)
        skill_points = round(13 * ratio)
        score += skill_points
        if overlap:
            reasons.append(f"Skill overlap: {', '.join(sorted(overlap)[:4])}.")
        missing = sorted(required - user_skills)
        if missing:
            gaps.append(f"Potential skill gaps: {', '.join(missing[:4])}.")

    score = max(0, min(100, score))
    return MatchResult(score, reasons, gaps, False)


def calculate_priority(
    match_score: int,
    vacancy_confidence: int,
    freshness_score: int,
    preferred_brand_bonus: int = 0,
) -> int:
    """Action priority. Inputs are 0-100; preferred_brand_bonus is 0-5."""
    raw = (
        match_score * 0.55
        + vacancy_confidence * 0.30
        + freshness_score * 0.15
        + preferred_brand_bonus
    )
    return max(0, min(100, round(raw)))
