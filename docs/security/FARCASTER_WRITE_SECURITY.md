# Far caster Write Security

## Principle

PULO never publishes content to Far caster without an explicit user intent or admin approval. All publishes go through the SafetyGate pipeline.

## Publish Paths

```
publish_reply action → SafetyGate.preCheck → LLM decision → SafetyGate.postCheck → provider.write.publishReply()
save_draft action → DB only (no publish)
escalate_to_admin → DB only (no publish)
```

## Idempotency

Every `publishReply` and `publishCast` call includes an `idempotencyKey` derived from the run ID:

```
publish-reply:{runId}
```

On retry, the same idempotency key is used, and `withIdempotencyKey()` prevents concurrent duplicate calls.

## Write Security Rules

| Rule | Enforcement |
|------|-------------|
| No publish without SafetyGate precheck | Orchestrator step 7 |
| No publish without SafetyGate postcheck | Orchestrator step 10 |
| No publish without user consent | `context.user.consents.autoPublish` checked |
| No publish without signer key | `FARCASTER_BOT_SIGNER_UUID` validated at factory |
| No publish without plan entitlement | `requiresApproval` flag checked per plan |
| No duplicate publish on retry | `withIdempotencyKey()` in-flight dedup |

## Signer Security

The bot signer (`FARCASTER_BOT_SIGNER_UUID`) is:
- **Server-side only**: Never exposed to frontend, never in logs
- **Validated early**: Checked at provider factory initialization (before any API call)
- **Environment-only**: Read from `process.env`, never from request bodies

## SafetyGate Integration

SafetyGate runs twice per agent pipeline:

1. **Step 7 — preCheck**: Before LLM decision. Blocks dangerous content from even entering the pipeline.
2. **Step 10 — postCheck**: After LLM generates reply text. Blocks if output contains risky patterns (private keys, drainer links, etc.).

Both blocks throw `SafetyBlockError` which is caught by the orchestrator and stored in `agent_runs` with `status=failed`.

## Plan Limits

| Plan | Publish | Auto-Publish |
|------|---------|-------------|
| free | Draft only | No |
| pro | Reply | No |
| creator | Reply | No |
| admin | Reply + Direct Cast | Yes |

## Audit Trail

All publish attempts are logged in `agent_runs` with:
- `runId`, `status`, `action`, `output` (cast hash on success)
- `errorCode` on failure (`FARCASTER_PUBLISH_FAILED`, `FARCASTER_SIGNER_MISSING`, etc.)

## What Gets Logged

| Event | Logged To |
|-------|----------|
| Publish success | `agent_runs.output.castHash` |
| Publish failure | `agent_runs.errorCode` + `agent_runs.status=failed` |
| Safety block | `agent_runs.status=failed`, `safety_flags` table |
| Idempotency dedup | In-memory `inFlightKeys` map (no external log) |

## What Never Happens

- No publish on behalf of user without their consent
- No signer key in URL params, headers, or request bodies
- No publish in mock mode ever calls Neynar
- No publish without SafetyGate postCheck passing