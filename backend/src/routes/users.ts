// ============================================================================
// USERS ROUTES
// ============================================================================

import { Router, Response } from 'express';
import { userRepository } from '../repositories/user.repository';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '../types/index';

const router = Router();

/**
 * Get all users (admin only)
 * GET /users
 */
router.get(
  '/',
  authMiddleware,
  requireRole(UserRole.ADMIN),
  (req: AuthRequest, res: Response): void => {
    const users = userRepository.findAll().map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      location: u.location,
      isActive: u.isActive,
    }));

    res.json({
      success: true,
      data: users,
    });
  }
);

/**
 * Get user by ID
 * GET /users/:id
 */
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  const user = userRepository.findById(req.params.id);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      isActive: user.isActive,
    },
  });
});

/**
 * Get users by role
 * GET /users/role/:role
 */
router.get(
  '/role/:role',
  authMiddleware,
  (req: AuthRequest, res: Response): void => {
    const role = req.params.role.toUpperCase();

    if (!Object.values(UserRole).includes(role as UserRole)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const users = userRepository.findByRole(role as UserRole).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      location: u.location,
      isActive: u.isActive,
    }));

    res.json({
      success: true,
      data: users,
    });
  }
);

/**
 * Update user
 * PUT /users/:id
 */
router.put(
  '/:id',
  authMiddleware,
  (req: AuthRequest, res: Response): void => {
    // Only admins or the user themselves can update
    if (req.user?.userId !== req.params.id && req.user?.role !== UserRole.ADMIN) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const user = userRepository.update(req.params.id, req.body);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
      },
    });
  }
);

export default router;
