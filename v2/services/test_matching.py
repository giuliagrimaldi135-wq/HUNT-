from matching import (
    MatchableJob,
    UserCareerProfile,
    calculate_match,
    calculate_priority,
)


def giulia_like_profile():
    return UserCareerProfile(
        primary_roles={"Retail Merchandising", "Buying"},
        secondary_roles={"Planning & Allocation", "Product", "Wholesale"},
        excluded_roles={"Sales Associate"},
        preferred_cities={"Milano"},
        relocation_cities={"Firenze"},
        skills={"Excel", "Orders", "Assortment"},
        seniority="entry",
    )


def test_primary_role_and_city_score_high():
    result = calculate_match(
        giulia_like_profile(),
        MatchableJob(
            brand="Prada",
            role_family="Retail Merchandising",
            city="Milano",
            seniority="entry",
            required_skills={"Excel"},
        ),
    )
    assert result.score >= 80
    assert result.hard_excluded is False


def test_explicit_exclusion_wins():
    result = calculate_match(
        giulia_like_profile(),
        MatchableJob(
            brand="Brand",
            role_family="Sales Associate",
            city="Milano",
            seniority="entry",
        ),
    )
    assert result.score == 0
    assert result.hard_excluded is True


def test_secondary_role_is_valid_but_lower():
    primary = calculate_match(
        giulia_like_profile(),
        MatchableJob("A", "Retail Merchandising", "Milano", "entry"),
    )
    secondary = calculate_match(
        giulia_like_profile(),
        MatchableJob("A", "Wholesale", "Milano", "entry"),
    )
    assert primary.score > secondary.score


def test_priority_needs_both_fit_and_real_vacancy():
    strong_real = calculate_priority(95, 95, 90)
    strong_suspicious = calculate_priority(95, 25, 90)
    assert strong_real > strong_suspicious
    assert strong_real >= 90
