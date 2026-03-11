import { test, expect } from '@playwright/test';

test('production health and admin login surface', async ({ page }) => {
  const email = process.env.SMOKE_ADMIN_EMAIL || '';
  const password = process.env.SMOKE_ADMIN_PASSWORD || '';

  await page.goto('/login');
  await expect(page.getByRole('heading')).toBeVisible();

  if (!email || !password) {
    test.skip(true, 'SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD are required');
    return;
  }

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in|continue/i }).click();

  await expect(page).toHaveURL(/admin|dashboard/i);
  await expect(page.getByText(/operations hub|dashboard/i)).toBeVisible();
});
