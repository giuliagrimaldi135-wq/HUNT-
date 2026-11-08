"""Source health guardrails for HUNT 2.0."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class SourceSnapshot:
    extracted_jobs: int
    request_ok: bool = True
    parser_ok: bool = True


@dataclass
class SourceHealthResult:
    healthy: bool
    status: str
    allow_mass_close: bool
    reason: str


def evaluate_source_health(
    current: SourceSnapshot,
    previous_extracted_jobs: int | None = None,
) -> SourceHealthResult:
    if not current.request_ok:
        return SourceHealthResult(
            False, "fetch_failed", False,
            "Source request failed; do not infer that vacancies closed."
        )

    if not current.parser_ok:
        return SourceHealthResult(
            False, "parser_failed", False,
            "Parser failed; preserve prior vacancy states."
        )

    if previous_extracted_jobs is None:
        return SourceHealthResult(True, "healthy", True, "No previous baseline.")

    if previous_extracted_jobs >= 10 and current.extracted_jobs == 0:
        return SourceHealthResult(
            False,
            "suspicious_zero",
            False,
            "Source dropped from many jobs to zero; likely source/parser change.",
        )

    ratio = current.extracted_jobs / max(previous_extracted_jobs, 1)
    if previous_extracted_jobs >= 20 and ratio < 0.15:
        return SourceHealthResult(
            False,
            "suspicious_drop",
            False,
            "Extracted vacancy count collapsed unexpectedly; verify before closing jobs.",
        )

    return SourceHealthResult(True, "healthy", True, "Source behavior is plausible.")
