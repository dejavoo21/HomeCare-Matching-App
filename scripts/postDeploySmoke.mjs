const appBaseUrl = process.env.APP_BASE_URL;
const smokeAdminEmail = process.env.SMOKE_ADMIN_EMAIL;
const smokeAdminPassword = process.env.SMOKE_ADMIN_PASSWORD;

if (!appBaseUrl) {
  throw new Error('APP_BASE_URL is required');
}

async function check(path, expectedStatus = 200, options = {}) {
  const response = await fetch(`${appBaseUrl}${path}`, options);

  if (response.status !== expectedStatus) {
    throw new Error(`Check failed for ${path}: expected ${expectedStatus}, got ${response.status}`);
  }

  const data = await response.json().catch(() => null);
  return { response, data };
}

async function getAuthCookie() {
  if (!smokeAdminEmail || !smokeAdminPassword) return '';

  const response = await fetch(`${appBaseUrl}/auth/phase4/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: smokeAdminEmail,
      password: smokeAdminPassword,
    }),
  });

  if (!response.ok) {
    throw new Error(`Admin login failed during smoke test: ${response.status}`);
  }

  const setCookie = response.headers.get('set-cookie') || '';
  return setCookie
    .split(',')
    .map((part) => part.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

async function run() {
  const health = await check('/health', 200);
  console.log('health ok:', health.data?.status || health.data?.ok);

  const ready = await check('/ready', 200);
  console.log('ready ok:', ready.data?.status || ready.data?.ok);

  if (smokeAdminEmail && smokeAdminPassword) {
    const cookie = await getAuthCookie();
    const schemaHealth = await check('/api/admin/schema-health', 200, {
      headers: cookie ? { Cookie: cookie } : {},
    });
    console.log('schema health ok:', schemaHealth.data?.success ?? schemaHealth.data?.ok);
  } else {
    console.log('schema health skipped: no smoke admin credentials provided');
  }

  console.log('post-deploy smoke passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
