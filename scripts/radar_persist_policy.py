"""Avoid publishing timestamp-only radar commits that trigger needless deploys.

Scanning and alerts continue on their existing schedule. A forced refresh every
12 hours keeps legacy GitHub Pages data fresh without deployment per scan.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VOLATILE_KEYS = frozenset({"last_seen_at", "updated_at", "generated_at", "checked_at"})


def semantic(value):
    if isinstance(value, dict):
        return {key: semantic(item) for key, item in value.items() if key not in VOLATILE_KEYS}
    if isinstance(value, list):
        return [semantic(item) for item in value]
    return value


def materially_changed(before, after):
    return semantic(before) != semantic(after)


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, check=False)


def changed_data():
    tracked = git("ls-files", "--", "data/*.json")
    if tracked.returncode != 0:
        raise RuntimeError("Cannot list tracked radar data")
    paths = {p for p in tracked.stdout.splitlines() if p.endswith(".json")}
    paths.update(str(p.relative_to(ROOT)) for p in (ROOT / "data").glob("*.json"))
    for relative in sorted(paths):
        current = ROOT / relative
        prior = git("show", "HEAD:" + relative)
        if not current.exists() and prior.returncode != 0:
            continue
        if not current.exists() or prior.returncode != 0:
            return True
        try:
            previous = json.loads(prior.stdout)
            updated = json.loads(current.read_text(encoding="utf-8"))
        except (ValueError, UnicodeDecodeError) as exc:
            raise RuntimeError(f"Invalid radar JSON in {relative}: {exc}") from exc
        if materially_changed(previous, updated):
            return True
    return False


def last_data_commit_age_hours():
    result = git("log", "-1", "--format=%ct", "--", "data/")
    if result.returncode != 0 or not result.stdout.strip():
        return float("inf")
    return max(0.0, (time.time() - int(result.stdout.strip())) / 3600)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-age-hours", type=float, default=12)
    args = parser.parse_args()
    if args.max_age_hours <= 0:
        raise ValueError("max-age-hours must be positive")
    needs_publish = changed_data() or last_data_commit_age_hours() >= args.max_age_hours
    print("PUBLISH" if needs_publish else "SKIP")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"HUNT radar persistence policy failed: {exc}", file=sys.stderr)
        raise SystemExit(2)
