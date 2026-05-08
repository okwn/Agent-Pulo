# SECRETS_AND_SIGNERS.md

## Critical Secrets

| Secret | Storage | Rotation |
|---|---|---|
| Neynar API Key | `NEYNAR_API_KEY` env var | 90 days |
| Neynar Signer Secret | `NEYNAR_SIGNER_SECRET` env var | Via Neynar dashboard |
| OpenAI API Key | `OPENAI_API_KEY` env var | 90 days |
| Anthropic API Key | `ANTHROPIC_API_KEY` env var | 90 days |
| Postgres Password | `DATABASE_URL` env var | 30 days |
| Redis Password | `REDIS_URL` env var | 90 days |

## Signer Key Management

- **Signer private keys must NEVER be in code or git**
- Stored only in environment variables at runtime
- Loaded via `process.env.PULO_SIGNER_UUID`
- Neynar manages signer lifecycle via their API

## Environment Variable Validation

On startup, all required secrets are validated:

```typescript
const REQUIRED_SECRETS = [
  'NEYNAR_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'DATABASE_URL',
  'REDIS_URL',
] as const;

for (const key of REQUIRED_SECRETS) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}
```

## Secret Rotation Runbook

1. Generate new key in provider dashboard
2. Update env var in deployment environment
3. Restart service (no downtime if using multiple replicas)
4. Verify health endpoints return 200
5. Revoke old key after 24h confirmation

## Far Signer UUID (`FARCASTER_BOT_SIGNER_UUID`)

The bot's signer UUID is a Neynar-managed identity used exclusively for **write operations**: publishing casts, publishing replies, and deleting casts. It is not used for read operations.

- Stored as `FARCASTER_BOT_SIGNER_UUID` env var
- Passed to Neynar write API as `signer_uuid`
- **Never exposed to frontend** — write methods are backend-only
- Throws `SignerError` if missing when publishing in live mode

## Audit

- Secret access is logged (not the value — just access events)
- Any missing secret on startup causes fatal error in live mode (mock mode starts without secrets)
- CI/CD never prints secret values to logs
- Write operations (publishCast, publishReply, deleteCast) are never callable from the web frontend