import type { Response, NextFunction } from 'express';
import type { Pool } from 'pg';
import type { AuthRequest } from './auth';
import { getUserPermissions } from '../repositories/rbac.repo';

/**
 * Middleware to check if user has required permissions
 * Usage: requirePermission(pool, 'offers:create', 'offers:override')
 */
export function requirePermission(pool: Pool, ...required: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const perms = await getUserPermissions(pool, req.user.userId);

      // Check if user has ALL required permissions
      const hasAllPerms = required.every((p) => perms.includes(p));

      if (!hasAllPerms) {
        res.status(403).json({
          error: 'Forbidden',
          message: `Missing required permissions: ${required.join(', ')}`,
          required,
          userPermissions: perms,
        });
        return;
      }

      // Attach permissions to request for use in route handlers
      (req as any).userPermissions = perms;
      next();
    } catch (err) {
      console.error('Permission middleware error:', err);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Middleware to check if user has ANY of the required permissions
 * Usage: requireAnyPermission(pool, 'offers:create', 'offers:override')
 */
export function requireAnyPermission(pool: Pool, ...required: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const perms = await getUserPermissions(pool, req.user.userId);

      // Check if user has ANY required permission
      const hasAnyPerm = required.some((p) => perms.includes(p));

      if (!hasAnyPerm) {
        res.status(403).json({
          error: 'Forbidden',
          message: `Missing any of required permissions: ${required.join(', ')}`,
          required,
        });
        return;
      }

      (req as any).userPermissions = perms;
      next();
    } catch (err) {
      console.error('Permission middleware error:', err);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}
