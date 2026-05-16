# 05_RADAR_ALERTING_STATUS.md

## Status: ✅ Fully Operational in Mock Mode

## Evidence

| File | Status |
|------|--------|
| `packages/radar/src/detector.ts` | ✅ `detectTrend()`, velocity scoring |
| `packages/radar/src/scorer.ts` | ✅ `scoreTrend()`, risk assessment |
| `apps/api/src/routes/radar.ts` | ✅ GET /api/radar/trends |
| `apps/api/src/routes/alerts.ts` | ✅ Alert CRUD + delivery tracking |
| `apps/api/src/routes/admin.ts` | ✅ POST /api/admin/trends/:id/approve |

## Working Pieces

- Trend detection from cast clusters
- Velocity scoring (mentions/minute)
- Admin approval workflow (detected → approved/rejected)
- Alert delivery to opted-in users
- Scam detection with suspicious link flagging
- `/admin/radar` page wired to `getAdminTrends()`
- Demo seed creates $GRASS Season 2 + FREE ETH scam trends

## Mocked Pieces

- All trends in mock mode are seeded via `pnpm demo:seed`
- No real-time Far caster stream scanning in mock mode

## Live-Key-Required

| Item | Key | Env |
|------|-----|-----|
| Neynar for stream | `NEYNAR_API_KEY` | `PULO_FARCASTER_MODE=live` |
| Warpcast for alerts | `WARPCAST_API_KEY` | Direct Cast notifications |

## Blockers

None. Radar and alerting work with seeded mock data.

## Risks

1. **Trend threshold tuning** — `PULO_RADAR_VELOCITY_THRESHOLD` may need adjustment based on real traffic
2. **Alert spam** — too-low threshold = too many alerts; too-high = missing trends
3. **Scam false positives** — legitimate airdrop announcements could be flagged as scam

## Commands

```bash
# Seed demo trends
pnpm demo:seed

# View trends in admin
# http://localhost:3100/admin/radar

# Approve trend via API
curl -X POST http://localhost:4311/api/admin/trends/trend_id/approve \
  -H "Cookie: pulo_demo_session=..." \
  -H "Content-Type: application/json"
```