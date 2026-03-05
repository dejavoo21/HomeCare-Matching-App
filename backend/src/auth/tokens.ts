import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_TTL_MIN = Number(process.env.ACCESS_TOKEN_TTL_MIN || 15);
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 14);

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function signAccessToken(payload: { userId: string; role: string; email: string }) {
  const secret = mustEnv("JWT_ACCESS_SECRET");
  return jwt.sign(payload, secret, { expiresIn: `${ACCESS_TTL_MIN}m` });
}

export function signRefreshToken(payload: { userId: string }) {
  const secret = mustEnv("JWT_REFRESH_SECRET");
  return jwt.sign(payload, secret, { expiresIn: `${REFRESH_TTL_DAYS}d` });
}

export function verifyAccessToken(token: string) {
  const secret = mustEnv("JWT_ACCESS_SECRET");
  return jwt.verify(token, secret) as any;
}

export function verifyRefreshToken(token: string) {
  const secret = mustEnv("JWT_REFRESH_SECRET");
  return jwt.verify(token, secret) as any;
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshExpiryDate() {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TTL_DAYS);
  return d;
}
