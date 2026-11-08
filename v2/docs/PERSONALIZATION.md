# HUNT 2.0 — Personalization Model

## Principle

The market database is global.
The recommendation layer is personal.

A vacancy exists once; matching is calculated separately for every user.

## Onboarding: minimum useful information

HUNT should ask only what materially changes recommendations.

1. Upload CV (optional at first, strongly recommended)
2. Primary career directions
3. Secondary directions
4. Roles the user does not want
5. Preferred locations
6. Locations they would relocate to
7. Target seniority / contract type
8. Languages
9. Optional preferred brands

The onboarding should take a few minutes, not feel like a job application.

## Explicit preferences beat inferred preferences

If the user says:
- "I do not want Sales Associate"
then HUNT must not relearn Sales from clicks.

If the user says:
- "Retail Merchandising is my first choice"
that remains stronger than an inferred pattern.

## Feedback loop

Useful events:
- save
- hide
- apply
- more like this
- too sales
- too senior
- wrong location
- brand yes / role no

HUNT should use these to adjust ranking gradually.

Do not make the system mysterious:
users should be able to inspect and edit their profile/preferences.

## Matching explanation

Every recommendation must answer:
- Why is this for me?
- What might be a gap?
- Why is it urgent or not?
- How confident are we the vacancy is active?

## Three independent outputs

### Match Score
Personal fit.

### Vacancy Confidence
Strength of vacancy evidence.

### Priority
Recommended action urgency.

Do not collapse all three into one number in the data model.
