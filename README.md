# HUNT

HUNT is a free, always-on fashion & luxury opportunity radar.

## MVP
- scans verified public career pages
- scores roles for Merchandising, Buying, Product, Retail Planning, Allocation and Wholesale
- deduplicates jobs and stores first-seen timestamps
- detects simple hidden signals such as hiring acceleration and public expansion/news signals
- creates a GitHub alert issue for new high-priority matches
- serves an installable PWA dashboard via GitHub Pages

## Not live yet
- direct Instagram monitoring
- private LinkedIn data or account automation
- AI reasoning on every signal
- native HUNT push notifications

Only public/authorized sources are used.

## Free architecture
GitHub Actions -> public sources -> JSON data -> GitHub Pages PWA

Scheduled scanner: every 5 minutes (GitHub may occasionally delay scheduled workflows).

## Privacy
This repository is public. Never commit a CV, phone number, email address, passwords, tokens or private documents here.
