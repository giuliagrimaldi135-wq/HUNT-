"""Detect known career-site / ATS families from public URLs."""
from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlsplit


@dataclass(frozen=True)
class SourceFamily:
    key: str
    label: str
    structured: bool
    default_trust: int


FAMILIES = {
    "workday": SourceFamily("workday", "Workday", True, 95),
    "successfactors": SourceFamily("successfactors", "SAP SuccessFactors", True, 95),
    "greenhouse": SourceFamily("greenhouse", "Greenhouse", True, 95),
    "lever": SourceFamily("lever", "Lever", True, 95),
    "smartrecruiters": SourceFamily("smartrecruiters", "SmartRecruiters", True, 95),
    "teamtailor": SourceFamily("teamtailor", "Teamtailor", True, 95),
    "recruitee": SourceFamily("recruitee", "Recruitee", True, 95),
    "workable": SourceFamily("workable", "Workable", True, 95),
    "taleo": SourceFamily("taleo", "Oracle/Taleo", True, 95),
    "custom_official": SourceFamily("custom_official", "Custom official careers", False, 90),
    "job_board": SourceFamily("job_board", "Public job board", False, 65),
    "aggregator": SourceFamily("aggregator", "Aggregator", False, 45),
    "unknown": SourceFamily("unknown", "Unknown", False, 30),
}

HOST_PATTERNS: list[tuple[str, tuple[str, ...]]] = [
    ("workday", ("myworkdayjobs.com", "workdayjobs.com")),
    ("successfactors", ("successfactors.com", "career5.successfactors.eu", "career2.successfactors.eu")),
    ("greenhouse", ("greenhouse.io", "boards.greenhouse.io", "job-boards.greenhouse.io")),
    ("lever", ("lever.co", "jobs.lever.co")),
    ("smartrecruiters", ("smartrecruiters.com", "jobs.smartrecruiters.com")),
    ("teamtailor", ("teamtailor.com",)),
    ("recruitee", ("recruitee.com",)),
    ("workable", ("workable.com", "apply.workable.com")),
    ("taleo", ("taleo.net",)),
]

JOB_BOARD_HOSTS = (
    "linkedin.com",
    "fashionjobs.com",
    "indeed.com",
    "glassdoor.com",
)

AGGREGATOR_HOSTS = (
    "jooble.",
    "talent.com",
    "jobrapido.",
)


def _host(url: str) -> str:
    try:
        return (urlsplit(url).hostname or "").lower()
    except Exception:
        return ""


def detect_source_family(url: str, official_hint: bool = False) -> SourceFamily:
    host = _host(url)

    for key, patterns in HOST_PATTERNS:
        if any(pattern in host for pattern in patterns):
            return FAMILIES[key]

    if any(pattern in host for pattern in JOB_BOARD_HOSTS):
        return FAMILIES["job_board"]

    if any(pattern in host for pattern in AGGREGATOR_HOSTS):
        return FAMILIES["aggregator"]

    if official_hint:
        return FAMILIES["custom_official"]

    return FAMILIES["unknown"]
