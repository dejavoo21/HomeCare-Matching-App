// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================
// Verify JWT tokens and attach user info to request

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { authService } from '../services/auth.service';

export interface AuthRequest extends Request {
  user?: TokenPayload & {
    userId: string;
  };
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  // Development bypass - allow all requests without auth
  if (process.env.NODE_ENV === 'development') {
    req.user = {
      userId: 'dev-admin',
      role: 'admin',
      email: 'dev@localhost',
    };
    next();
    return;
  }

  const token =
    req.headers.authorization?.replace('Bearer ', '') ||
    req.cookies?.accessToken;

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    // Verify JWT token
    const payload = verifyAccessToken(token);

    req.user = {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
    } as TokenPayload & { userId: string };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Development bypass
    if (process.env.NODE_ENV === 'development') {
      next();
      return;
    }

    if (!req.user) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // Normalize both sides to lowercase for consistent comparison
    const normalizedRoles = roles.map((r) => String(r || '').toLowerCase());
    const userRole = String(req.user.role || '').toLowerCase();

    if (!normalizedRoles.includes(userRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function requireVerification(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized: No user in request' });
    return;
  }

  // For verified professional actions (high-stakes assignments)
  // Check verification status - this would need to be added to authService
  next();
}
