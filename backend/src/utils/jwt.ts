// ============================================================================
// JWT UTILITIES - Access & Refresh Tokens
// ============================================================================

import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || process.env.ACCESS_SECRET || 'access-secret-dev';

const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || process.env.REFRESH_SECRET || 'refresh-secret-dev';

const ACCESS_TTL_MIN = Number(process.env.ACCESS_TOKEN_TTL_MIN || 15);
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 14);

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_ACCESS_SECRET && !process.env.ACCESS_SECRET) {
    throw new Error('Missing JWT_ACCESS_SECRET in production');
  }
  if (!process.env.JWT_REFRESH_SECRET && !process.env.REFRESH_SECRET) {
    throw new Error('Missing JWT_REFRESH_SECRET in production');
  }
}

export interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface RefreshPayload extends JwtPayload {
  userId: string;
  tokenId: string;
}

/**
 * Sign an access token (default 15 minutes)
 */
export function signAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: `${ACCESS_TTL_MIN}m`,
  });
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

/**
 * Sign a refresh token (default 14 days)
 */
export function signRefreshToken(payload: Omit<RefreshPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: `${REFRESH_TTL_DAYS}d`,
  });
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshPayload;
}

/**
 * Hash a token for DB storage using SHA-256
 * Store only the hash, never the raw token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Compare raw token to stored hash
 */
export function compareTokenHash(rawToken: string, storedHash: string): boolean {
  return hashToken(rawToken) === storedHash;
}

/**
 * Calculate refresh token expiry date
 */
export function refreshExpiryDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TTL_DAYS);
  return d;
}

/**
 * Decode JWT without verification (debug only)
 */
export function decodeToken(token: string): JwtPayload | string | null {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}
