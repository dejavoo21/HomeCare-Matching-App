import { test, expect } from '@playwright/test';

test('critical admin pages load', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await expect(page.getByText(/operations hub|dashboard/i)).toBeVisible();

  await page.goto('/admin/dispatch');
  await expect(page.getByText(/dispatch/i)).toBeVisible();

  await page.goto('/admin/scheduling');
  await expect(page.getByText(/scheduling/i)).toBeVisible();

  await page.goto('/admin/analytics');
  await expect(page.getByText(/analytics/i)).toBeVisible();
});
