from ingestion.canonicalize import (
    canonicalize,
    classify_role,
    classify_seniority,
    normalize_location,
)
from ingestion.models import RawJob


def test_prada_retail_merchandising_normalization():
    raw = RawJob(
        source_name="Prada Careers",
        source_type="official",
        company_name="Prada Group",
        title="Retail Merchandising Intern",
        listing_url="https://example.com/job/21280",
        requisition_id="21280",
        location="MILANO, IT",
        description="Support the Worldwide Retail Merchandising Manager and sales budget planning.",
    )
    job = canonicalize(raw)
    assert job.role_family == "Retail Merchandising"
    assert job.seniority == "entry"
    assert job.city == "Milano"
    assert job.country_code == "IT"
    assert job.requisition_id == "21280"


def test_buying_role():
    assert classify_role("Buying & Curation Intern") == "Buying"


def test_senior_title_is_not_entry():
    assert classify_seniority("Senior Merchandising Manager") == "senior"


def test_location_ar():
    assert normalize_location("Valvigna (AR), Terranuova Bracciolini") == ("Arezzo", "IT")
