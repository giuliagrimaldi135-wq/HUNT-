from datetime import datetime, timezone

from intelligence.vacancy_confidence import VacancySignals
from intelligence.lifecycle import LifecycleInput, determine_lifecycle


def test_official_working_apply_is_verified_active():
    result = determine_lifecycle(LifecycleInput(VacancySignals(
        official_listing_present=True,
        official_apply_works=True,
        requisition_id_present=True,
        verified_at=datetime.now(timezone.utc),
    )))
    assert result.state == "active_verified"


def test_explicit_official_close_wins():
    result = determine_lifecycle(LifecycleInput(
        VacancySignals(
            official_listing_missing=True,
            apply_link_dead=True,
        ),
        official_closed_explicitly=True,
    ))
    assert result.state == "closed_verified"


def test_repeated_talent_pool_can_be_evergreen():
    result = determine_lifecycle(LifecycleInput(VacancySignals(
        explicit_talent_pool_language=True,
        repeated_identical_reposts=6,
        only_aggregator_sources=True,
    )))
    assert result.state in {"evergreen_possible", "stale_possible"}
