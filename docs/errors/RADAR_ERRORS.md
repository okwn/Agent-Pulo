# RADAR Errors

## Error Codes

All radar errors are prefixed with `RADAR_`.

| Code | Description | Severity |
|------|-------------|----------|
| `RADAR_NO_CHANNELS` | No watched channels configured | warn |
| `RADAR_SCAN_FAILED` | Radar scan job failed | error |
| `RADAR_NO_CASTS` | Channel returned no casts | debug |
| `RADAR_DB_PERSIST_FAILED` | Failed to persist trend to DB | error |
| `RADAR_TREND_NOT_FOUND` | Requested trend ID not found | warn |
| `RADAR_APPROVE_FAILED` | Admin approve operation failed | error |
| `RADAR_REJECT_FAILED` | Admin reject operation failed | error |
| `RADAR_INVALID_STATUS` | Invalid admin status transition | warn |
| `RADAR_SUSPICIOUS_LINK` | Cast contains suspicious link | warn |
| `RADAR_CLAIM_RISK` | Cast claim risk pattern detected | warn |
| `RADAR_WORKER_OFFLINE` | Radar worker not responding | critical |

## Status Transitions

```
detected → watching → approved / rejected → alerted / archived
```

Invalid transitions return `RADAR_INVALID_STATUS`.

## Risk Levels

- `low` — normal trend
- `medium` — claim risk or suspicious link detected
- `high` — multiple risk signals
- `critical` — scam confirmed
- `unknown` — insufficient data
