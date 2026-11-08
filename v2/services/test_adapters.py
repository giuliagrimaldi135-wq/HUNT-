from unittest.mock import Mock, patch

from ingestion.greenhouse import GreenhouseAdapter
from ingestion.lever import LeverAdapter
from intelligence.source_health import SourceSnapshot, evaluate_source_health


def test_greenhouse_parse_job():
    adapter = GreenhouseAdapter("brand", "Brand")
    job = adapter._parse_job({
        "id": 123,
        "internal_job_id": 987,
        "title": "Retail Merchandising Intern",
        "location": {"name": "Milano, Italy"},
        "absolute_url": "https://example.com/job/123",
        "content": "<p>Product selection</p>",
        "updated_at": "2026-11-08T10:00:00Z",
    })
    assert job.title == "Retail Merchandising Intern"
    assert job.external_job_id == "123"
    assert job.requisition_id == "987"
    assert job.location == "Milano, Italy"


def test_lever_parse_job():
    adapter = LeverAdapter("brand", "Brand")
    job = adapter._parse_job({
        "id": "abc",
        "text": "Buying Intern",
        "categories": {"location": "Milan"},
        "descriptionPlain": "Support buying.",
        "hostedUrl": "https://jobs.lever.co/brand/abc",
        "applyUrl": "https://jobs.lever.co/brand/abc/apply",
    })
    assert job.title == "Buying Intern"
    assert job.external_job_id == "abc"
    assert job.apply_url.endswith("/apply")


def test_source_zero_collapse_does_not_close_everything():
    result = evaluate_source_health(
        SourceSnapshot(extracted_jobs=0),
        previous_extracted_jobs=35,
    )
    assert result.healthy is False
    assert result.allow_mass_close is False
    assert result.status == "suspicious_zero"


def test_small_normal_change_is_healthy():
    result = evaluate_source_health(
        SourceSnapshot(extracted_jobs=18),
        previous_extracted_jobs=20,
    )
    assert result.healthy is True
    assert result.allow_mass_close is True
