#!/usr/bin/env bash
# 0 = Vercel skips build; 1 = build as usual.
# The public radar's data/** JSON updates are for GitHub Pages, while the
# HUNT 2 Next.js frontend uses Supabase live data and is under v2/web/.
set -u
root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 1
git -C "$root" rev-parse --verify HEAD^ >/dev/null 2>&1 || exit 1
# Build when the Next app, root dependencies or deployment configuration change.
# For all unknown/error cases, fail open (build), never silently miss a release.
if git -C "$root" diff --quiet HEAD^ HEAD -- \
  v2/web/ package.json package-lock.json vercel.json scripts/hunt-vercel-ignore.sh; then
  echo "HUNT: skipping Vercel build — changes are outside the Next.js frontend"
  exit 0
fi
echo "HUNT: frontend or deployment configuration changed — build required"
exit 1
