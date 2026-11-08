"""Pure HUNT 2.0 ingestion pipeline helpers.

Persistence is intentionally separate so the same pipeline can be tested locally
before connecting Supabase/Postgres.
"""
from __future__ import annotations

from dataclasses import dataclass

from .canonicalize import canonicalize
from .models import CanonicalJobDraft, RawJob
from ..intelligence.dedupe import JobCandidate, compare_jobs


@dataclass
class BatchResult:
    canonical_jobs: list[CanonicalJobDraft]
    duplicate_groups: list[list[int]]


def _candidate(job: CanonicalJobDraft) -> JobCandidate:
    return JobCandidate(
        company_key=job.company_name,
        title=job.canonical_title,
        location=job.city,
        requisition_id=job.requisition_id,
        external_job_id=job.source.external_job_id,
        apply_url=job.primary_apply_url,
        description=job.description,
    )


def canonicalize_and_group(raw_jobs: list[RawJob]) -> BatchResult:
    canonical = [canonicalize(job) for job in raw_jobs]
    groups: list[list[int]] = []
    assigned: set[int] = set()

    for i, job in enumerate(canonical):
        if i in assigned:
            continue

        group = [i]
        assigned.add(i)

        for j in range(i + 1, len(canonical)):
            if j in assigned:
                continue

            decision = compare_jobs(_candidate(job), _candidate(canonical[j]))
            if decision.same_job:
                group.append(j)
                assigned.add(j)

        groups.append(group)

    return BatchResult(canonical_jobs=canonical, duplicate_groups=groups)
