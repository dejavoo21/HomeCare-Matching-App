const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://beneficial-solace-production-0743.up.railway.app',
];

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

export function getAllowedOrigins(): string[] {
  const configured = String(process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured].map(normalizeOrigin))];
}

export function isAllowedOrigin(origin?: string | null): boolean {
  if (!origin) {
    return true;
  }

  const normalized = normalizeOrigin(origin);
  return getAllowedOrigins().includes(normalized);
}

export function resolveCorsOrigin(origin?: string | null): string {
  if (origin && isAllowedOrigin(origin)) {
    return normalizeOrigin(origin);
  }

  return getAllowedOrigins()[0];
}
