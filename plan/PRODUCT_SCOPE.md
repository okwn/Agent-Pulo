# PRODUCT_SCOPE.md

## What we are building

PULO — a Far-native AI agent that acts as a user's personal intelligence layer.

## In Scope

- Far mention bot (@pulo)
- Truth/risk analysis for claims
- Trend detection for airdrops, grants, rewards, programs
- User alert preferences per keyword/topic
- Web dashboard for preference management
- Admin panel for system oversight
- Safe, rate-limited, abuse-resistant automation

## Out of Scope (Phase 1)

- Image/video analysis
- Multi-language support
- Third-party integrations beyond Far
- Billing / subscription management (manual for now)
- Mobile-native app (only web/responsive)

## Success Metrics

- Bot responds to mentions < 5s
- Truth analysis has < 10% false positive rate
- Trend detection recall > 80% on known keywords
- Zero unauthorized data access
- No hard-down incidents in first 30 days

## Constraints

- All secrets in env vars, never in git
- Port-agnostic startup with dynamic discovery
- Local-first, Docker-friendly
- Must run on low-cost VPS (512MB RAM target)