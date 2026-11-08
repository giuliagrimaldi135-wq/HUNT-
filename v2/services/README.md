# HUNT 2.0 services

The v2 engine is intentionally separated from the current personal HUNT app.

## Current modules

- `ingestion/models.py`: source-neutral raw/canonical job data structures
- `ingestion/base.py`: adapter interface
- `ingestion/canonicalize.py`: role, seniority, location and employment normalization
- `intelligence/dedupe.py`: deterministic duplicate detection
- `intelligence/vacancy_confidence.py`: explainable vacancy confidence

## Testing

From `v2/services`:

```bash
python -m pytest -q
```

Current tests are pure and require no external services.

## Design rule

Source adapters collect evidence.
They do not decide whether a role is good for a user.

Global vacancy intelligence and personal matching remain separate layers.
