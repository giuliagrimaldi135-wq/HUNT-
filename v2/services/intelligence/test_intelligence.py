from datetime import datetime, timedelta, timezone

from intelligence.dedupe import JobCandidate, compare_jobs
from intelligence.vacancy_confidence import VacancySignals, calculate_vacancy_confidence


def test_same_requisition_is_same_job():
    a = JobCandidate("Prada", "Retail Merchandising Intern", "Milano", requisition_id="21280")
    b = JobCandidate("Prada", "Retail Merchandising Intern", "Milan", requisition_id="21280")
    result = compare_jobs(a, b)
    assert result.same_job is True
    assert result.reason == "same_requisition_id"


def test_different_companies_never_merge():
    a = JobCandidate("Prada", "Buying Intern", "Milano", description="same description")
    b = JobCandidate("Miu Miu", "Buying Intern", "Milano", description="same description")
    assert compare_jobs(a, b).same_job is False


def test_verified_official_job_scores_high():
    now = datetime.now(timezone.utc)
    result = calculate_vacancy_confidence(VacancySignals(
        official_listing_present=True,
        official_apply_works=True,
        requisition_id_present=True,
        verified_at=now,
        published_at=now - timedelta(days=2),
        trustworthy_source_count=2,
    ))
    assert result.score >= 80
    assert result.label == "VERIFIED ACTIVE"


def test_aggregator_only_old_dead_job_scores_low():
    now = datetime.now(timezone.utc)
    result = calculate_vacancy_confidence(VacancySignals(
        official_listing_missing=True,
        apply_link_dead=True,
        only_aggregator_sources=True,
        published_at=now - timedelta(days=100),
        repeated_identical_reposts=5,
    ))
    assert result.score < 40


def test_reposts_do_not_automatically_make_official_job_fake():
    now = datetime.now(timezone.utc)
    result = calculate_vacancy_confidence(VacancySignals(
        official_listing_present=True,
        official_apply_works=True,
        requisition_id_present=True,
        verified_at=now,
        published_at=now - timedelta(days=5),
        repeated_identical_reposts=4,
    ))
    assert result.score >= 60
