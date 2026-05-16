# E2E_FLOWS.md — End-to-End Test Coverage

## Playwright Configuration

- Config: `apps/web/playwright.config.ts`
- Test dir: `apps/web/e2e/`
- Base URL: `http://localhost:3100` (configurable via `PULO_WEB_URL`)
- Browser: Chromium (desktop)

## Test Files

### `app.spec.ts` — Core Page Load Tests

#### Dashboard
- `homepage loads without crash` — no error boundary
- `navigation to admin redirects to login when needed` — auth guard

#### Admin Pages (after demo login)
- `admin system page loads`
- `admin radar page loads`
- `admin jobs page loads`
- `admin errors page loads`
- `admin truth-checks page loads`
- `admin events page loads`
- `admin safety page loads`

#### User-Facing Pages
- `billing page loads`
- `settings page loads`
- `composer page loads`

## Running E2E Tests

```bash
# Run all E2E tests (requires web app running)
pnpm test:e2e

# Run with UI (interactive browser)
pnpm test:e2e:ui

# Against different base URL
PULO_WEB_URL=http://staging:3100 pnpm test:e2e
```

## Adding New E2E Tests

```typescript
// apps/web/e2e/new-feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('New Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login or setup state
    await page.goto('/admin/login');
    await page.click('button:has-text("Demo")');
    await page.waitForTimeout(500);
  });

  test('feature works correctly', async ({ page }) => {
    await page.goto('/feature-page');
    await expect(page.locator('h1')).toContainText('Expected Title');
  });
});
```

## CI Mode

In CI (`CI=true`):
- `forbidOnly: true` — no `test.only()` can be committed
- `retries: 2` — flaky tests can retry
- `workers: 1` — sequential to avoid port conflicts

## Coverage Summary

| Page | Load Test | Functional Test |
|------|-----------|----------------|
| Dashboard | ✅ | - |
| Admin /system | ✅ | - |
| Admin /radar | ✅ | - |
| Admin /jobs | ✅ | - |
| Admin /errors | ✅ | - |
| Admin /truth-checks | ✅ | - |
| Admin /events | ✅ | - |
| Admin /safety | ✅ | - |
| /billing | ✅ | - |
| /settings | ✅ | - |
| /composer | ✅ | - |