import { chromium } from 'playwright';

const EMAIL = 'onboarding@sochristventures.com';
const PASSWORD = 'Homecare12345';
const URL = 'https://beneficial-solace-production-0743.up.railway.app/login';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

page.on('response', async (res) => {
  const u = res.url();
  if (
    u.includes('/auth/phase4/login') ||
    u.includes('/auth/me') ||
    u.includes('/auth/phase4/refresh')
  ) {
    console.log(`RESP ${res.status()} ${u}`);
    if (u.includes('/auth/phase4/login')) {
      try {
        const body = await res.json();
        console.log(`LOGIN_BODY ${JSON.stringify(body)}`);
      } catch {}
    }
  }
});

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button:has-text("Continue")');

await page.waitForTimeout(4000);

const apiCookies = await context.cookies('https://homecare-matching-app-production.up.railway.app');
console.log(`API_COOKIE_COUNT ${apiCookies.length}`);
for (const c of apiCookies) {
  console.log(`COOKIE ${c.name} secure=${c.secure} sameSite=${c.sameSite}`);
}

const currentUrl = page.url();
const loginFailedVisible = await page.locator('text=Login failed').isVisible().catch(() => false);
const sessionExpiredVisible = await page
  .locator('text=Session expired. Please log in again.')
  .isVisible()
  .catch(() => false);

console.log(`URL ${currentUrl}`);
console.log(`LOGIN_FAILED_VISIBLE ${loginFailedVisible}`);
console.log(`SESSION_EXPIRED_VISIBLE ${sessionExpiredVisible}`);

await browser.close();
