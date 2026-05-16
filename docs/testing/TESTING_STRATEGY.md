# TESTING_STRATEGY.md — PULO Testing Overview

## Testing Pyramid

```
         ┌─────┐
         │ E2E │           Playwright - critical user flows
        ┌┴─────┴┐
        │  API  │          Vitest integration - webhook, truth, radar, alert
       ┌┴───────┴┐
       │ Unit    │         Vitest - packages, components
      ┌┴──────────┴┐
      │ Type+Lint  │     tsc --noEmit, eslint
```

## Test Types

### Unit Tests (`pnpm test`)
- Packages: llm, errors, safety, billing, composer, observability, radar, truth, agent-core
- Apps: api (non-integration), web, worker
- Run: `pnpm test` (all packages in parallel)

### Integration Tests (`pnpm test:integration`)
- Requires running API (`pnpm dev:api`)
- Tests full HTTP flows: webhook → mention → agent → storage
- Location: `apps/api/test/integration/*.test.ts`
- **Skips automatically** if API not reachable (localhost:4311)

Integration tests cover:
- `webhook-mention.test.ts` — mock webhook, deduplication
- `truth-check.test.ts` — truth check pipeline
- `radar-workflow.test.ts` — trend detection, admin approval
- `alert-delivery.test.ts` — alert creation and delivery
- `plan-limit.test.ts` — rate limit enforcement, upgrade CTA
- `llm-fallback.test.ts` — mock LLM, fallback behavior
- `missing-keys.test.ts` — graceful degradation without live keys

### E2E Tests (`pnpm test:e2e`)
- Playwright, requires web app running (`pnpm dev:web`)
- Location: `apps/web/e2e/*.spec.ts`
- Optional in CI (can be skipped if `--skip-e2e`)

E2E tests cover:
- Dashboard loads without crash
- Admin pages load (system, radar, jobs, errors, truth-checks, events, safety)
- User-facing pages (billing, settings, composer)
- Admin login → demo session → protected routes

## Running Tests

| Command | What it does |
|---------|-------------|
| `pnpm test` | Unit tests across all packages |
| `pnpm test:integration` | Integration tests (requires API running) |
| `pnpm test:e2e` | Playwright E2E (requires web running) |
| `pnpm test:e2e:ui` | Playwright UI mode for debugging |
| `pnpm test:all` | unit + integration + e2e |

## Demo / Seed Data Tests

| Command | What it does |
|---------|-------------|
| `pnpm demo:seed` | Seed DB with demo scenarios |
| `pnpm demo:run` | Run all 6 demo scenarios |
| `pnpm demo:run:truth` | Run truth check scenario |
| `pnpm demo:run:radar` | Run radar trend scenario |
| `pnpm demo:run:alert` | Run scam alert scenario |
| `pnpm demo:run:mention` | Run mention summary scenario |
| `pnpm demo:reset` | Clear demo data (requires --force) |

## Test Fixtures

Location: `tests/fixtures/` — shared test data generators

Location: `tests/helpers/` — shared test utilities:
- `setup.ts` — `isReachable()`, `UniqueId()`, `sendWebhook()`, `seedDemoData()`, `resetDemoData()`

## CI Integration

```yaml
# Example CI workflow
test:
  steps:
    - run: pnpm typecheck
    - run: pnpm test          # unit tests (no services needed)
    - run: pnpm dev:api &     # start API in background
    - run: sleep 5 && pnpm test:integration  # integration (needs API)
    - run: pnpm test:e2e      # e2e (needs web + api)
```

## Coverage Goals

| Layer | Target |
|-------|--------|
| Unit (packages) | 80%+ coverage on core logic |
| Integration | Critical paths: webhook, truth, radar, alert, plan-limit, LLM fallback |
| E2E | Dashboard load, admin pages load, demo flow |

## Validation

```bash
# Validate all tests pass
pnpm typecheck && pnpm test && pnpm test:integration && pnpm test:e2e
```