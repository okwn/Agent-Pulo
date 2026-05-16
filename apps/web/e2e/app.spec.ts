// E2E: Dashboard loads
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('homepage loads without crash', async ({ page }) => {
    // Should not show error boundary
    await expect(page.locator('body')).toBeVisible();

    // No error boundary text visible
    const errorText = page.locator('text=Something went wrong');
    await expect(errorText).not.toBeVisible({ timeout: 5000 });
  });

  test('navigation to admin redirects to login when needed', async ({ page }) => {
    await page.goto('/admin');
    // Should redirect to login or show admin
    // Either way no crash
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Admin Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin login first to get demo cookie
    await page.goto('/admin/login');
    // Click demo login if button exists
    const demoBtn = page.locator('button:has-text("Demo")').first();
    if (await demoBtn.isVisible({ timeout: 3000 })) {
      await demoBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('admin system page loads', async ({ page }) => {
    await page.goto('/admin/system');

    // Should show some heading or content
    await expect(page.locator('body')).toBeVisible();

    // Should not be error page
    const errorBoundary = page.locator('text=Application Error');
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 });
  });

  test('admin radar page loads', async ({ page }) => {
    await page.goto('/admin/radar');

    await expect(page.locator('body')).toBeVisible();
    const errorBoundary = page.locator('text=Application Error');
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 });
  });

  test('admin jobs page loads', async ({ page }) => {
    await page.goto('/admin/jobs');

    await expect(page.locator('body')).toBeVisible();
    const errorBoundary = page.locator('text=Application Error');
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 });
  });

  test('admin errors page loads', async ({ page }) => {
    await page.goto('/admin/errors');

    await expect(page.locator('body')).toBeVisible();
    const errorBoundary = page.locator('text=Application Error');
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 });
  });

  test('admin truth-checks page loads', async ({ page }) => {
    await page.goto('/admin/truth-checks');

    await expect(page.locator('body')).toBeVisible();
    const errorBoundary = page.locator('text=Application Error');
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 });
  });

  test('admin events page loads', async ({ page }) => {
    await page.goto('/admin/events');

    await expect(page.locator('body')).toBeVisible();
    const errorBoundary = page.locator('text=Application Error');
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 });
  });

  test('admin safety page loads', async ({ page }) => {
    await page.goto('/admin/safety');

    await expect(page.locator('body')).toBeVisible();
    const errorBoundary = page.locator('text=Application Error');
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('User-Facing Pages', () => {
  test('billing page loads', async ({ page }) => {
    await page.goto('/billing');

    await expect(page.locator('body')).toBeVisible();
    const errorBoundary = page.locator('text=Application Error');
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 });
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.locator('body')).toBeVisible();
    const errorBoundary = page.locator('text=Application Error');
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 });
  });

  test('composer page loads', async ({ page }) => {
    await page.goto('/composer');

    await expect(page.locator('body')).toBeVisible();
    const errorBoundary = page.locator('text=Application Error');
    await expect(errorBoundary).not.toBeVisible({ timeout: 5000 });
  });
});