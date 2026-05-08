# PULO_RADAR_SPEC.md

## Overview

Trend Radar monitors Far casts in real-time for keywords and patterns indicating airdrops, grants, reward programs, token launches, and other financial opportunities.

## Detection Categories

| Category | Keywords | Confidence Boost |
|---|---|---|
| Airdrop | airdrop, claiming, snapshot, eligibility, free tokens | +0.3 |
| Grant | grant, funding, proposal, treasury, RFP | +0.3 |
| Reward | reward, staking, yield, farm, earn, APR | +0.2 |
| Token Launch | ICO, IDO, TGE, listing, launch, mint | +0.2 |
| Program | bug bounty, ambassador, contributor, guild | +0.2 |

## Alert Flow

```
1. New cast detected (webhook or polling)
2. Keyword extraction → candidate list
3. Confidence scoring (base + boosts)
4. If score > threshold (0.6) → match
5. Lookup user's alert config for keyword
6. If user has matching enabled alert → enqueue alert
7. Alert delivered via DM or cast reply
```

## False Positive Management

- Minimum 3 keyword matches in different casts before first alert
- Cooling period: 30 minutes between alerts for same keyword
- User can mark alert as noise → improves future filtering

## Performance

- Process incoming casts within 10 seconds
- Radar scan cycle: every 60 seconds for latest casts
- Max alerts per user per day: tier-limited

## Data Model

```typescript
interface TrendAlert {
  id: string;
  keyword: string;
  category: 'airdrop' | 'grant' | 'reward' | 'token' | 'program';
  confidence: number; // 0–1
  firstSeenAt: Date;
  castHash: string;
  triggeredCount: number;
}
```