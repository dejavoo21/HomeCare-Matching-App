// ============================================================================
// JWT UTILITIES - Access & Refresh Tokens
// ============================================================================

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.ACCESS_SECRET || 'access-secret-dev';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_SECRET || 'refresh-secret-dev';
const ACCESS_TTL_MIN = Number(process.env.ACCESS_TOKEN_TTL_MIN || 15);
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 14);

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface RefreshPayload {
  userId: string;
  tokenId?: string;
  iat?: number;
}

/**
 * Sign an access token (configurable TTL, default 15 minutes)
 * @param payload User data to encode
 * @returns JWT access token
 */
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: `${ACCESS_TTL_MIN}m` });
}

/**
 * Verify an access token
 * @param token JWT access token
 * @returns Decoded payload or throws
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

/**
 * Sign a refresh token (configurable TTL, default 14 days)
 * @param payload Minimal refresh payload
 * @returns JWT refresh token
 */
export function signRefreshToken(payload: RefreshPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: `${REFRESH_TTL_DAYS}d` });
}

/**
 * Verify a refresh token
 * @param token JWT refresh token
 * @returns Decoded payload or throws
 */
export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshPayload;
}

/**
 * Hash a token for storage (SHA-256)
 * Prevents storing raw tokens in database
 * @param token Raw token string
 * @returns Hex hash
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Calculate refresh token expiry date
 * @returns Date object set to REFRESH_TTL_DAYS from now
 */
export function refreshExpiryDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TTL_DAYS);
  return d;
}

/**
 * Decode JWT without verification (for debugging)
 * DO NOT use for security decisions
 * @param token JWT token
 * @returns Decoded payload or null
 */
export function decodeToken(token: string): any {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}
