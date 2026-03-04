// ============================================================================
// AVAILABILITY ROUTES
// ============================================================================
// Manage professional availability rules and exceptions

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { authMiddleware, requireRole } from '../middleware/auth';
import { logAudit } from '../services/audit.service';

export function availabilityRouter(pool: Pool) {
  const router = Router();

  // Get current user's availability rules and exceptions
  router.get('/me', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.userId;

      const rules = await pool.query(
        `SELECT * FROM availability_rules 
         WHERE professional_user_id = $1 
         ORDER BY day_of_week ASC`,
        [userId]
      );

      const exceptions = await pool.query(
        `SELECT * FROM availability_exceptions 
         WHERE professional_user_id = $1 
         ORDER BY exception_date DESC`,
        [userId]
      );

      res.json({
        rules: rules.rows,
        exceptions: exceptions.rows,
      });
    } catch (err) {
      console.error('Error fetching availability:', err);
      res.status(500).json({ error: 'Failed to fetch availability' });
    }
  });

  // Create availability rule (weekly recurring)
  router.post('/rules', authMiddleware, requireRole('professional'), async (req: any, res: Response) => {
    try {
      const { dayOfWeek, startTime, endTime } = req.body;
      const userId = req.user.userId;

      // Validate input
      if (!dayOfWeek || !startTime || !endTime) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (dayOfWeek < 0 || dayOfWeek > 6) {
        return res.status(400).json({ error: 'Invalid day of week (0-6)' });
      }

      const result = await pool.query(
        `INSERT INTO availability_rules 
         (professional_user_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, dayOfWeek, startTime, endTime]
      );

      await logAudit(pool, {
        actorId: userId,
        actionType: 'AVAILABILITY_RULE_CREATED',
        entityType: 'availability_rule',
        entityId: result.rows[0].id,
        metadata: { dayOfWeek, startTime, endTime },
      });

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating availability rule:', err);
      res.status(500).json({ error: 'Failed to create availability rule' });
    }
  });

  // Create availability exception (one-time block or override)
  router.post('/exceptions', authMiddleware, requireRole('professional'), async (req: any, res: Response) => {
    try {
      const { exceptionDate, startTime, endTime, isBlocked } = req.body;
      const userId = req.user.userId;

      if (!exceptionDate) {
        return res.status(400).json({ error: 'Missing exception_date' });
      }

      const result = await pool.query(
        `INSERT INTO availability_exceptions 
         (professional_user_id, exception_date, start_time, end_time, is_blocked)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, exceptionDate, startTime || null, endTime || null, isBlocked || false]
      );

      await logAudit(pool, {
        actorId: userId,
        actionType: 'AVAILABILITY_EXCEPTION_CREATED',
        entityType: 'availability_exception',
        entityId: result.rows[0].id,
        metadata: { exceptionDate, isBlocked },
      });

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating availability exception:', err);
      res.status(500).json({ error: 'Failed to create availability exception' });
    }
  });

  // Delete availability rule
  router.delete('/rules/:ruleId', authMiddleware, requireRole('professional'), async (req: any, res: Response) => {
    try {
      const { ruleId } = req.params;
      const userId = req.user.userId;

      // Verify ownership
      const rule = await pool.query(
        'SELECT * FROM availability_rules WHERE id = $1 AND professional_user_id = $2',
        [ruleId, userId]
      );

      if (rule.rows.length === 0) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      await pool.query('DELETE FROM availability_rules WHERE id = $1', [ruleId]);

      await logAudit(pool, {
        actorId: userId,
        actionType: 'AVAILABILITY_RULE_DELETED',
        entityType: 'availability_rule',
        entityId: ruleId,
        metadata: {},
      });

      res.json({ message: 'Rule deleted' });
    } catch (err) {
      console.error('Error deleting availability rule:', err);
      res.status(500).json({ error: 'Failed to delete availability rule' });
    }
  });

  // Delete availability exception
  router.delete('/exceptions/:exceptionId', authMiddleware, requireRole('professional'), async (req: any, res: Response) => {
    try {
      const { exceptionId } = req.params;
      const userId = req.user.userId;

      // Verify ownership
      const exception = await pool.query(
        'SELECT * FROM availability_exceptions WHERE id = $1 AND professional_user_id = $2',
        [exceptionId, userId]
      );

      if (exception.rows.length === 0) {
        return res.status(404).json({ error: 'Exception not found' });
      }

      await pool.query('DELETE FROM availability_exceptions WHERE id = $1', [exceptionId]);

      await logAudit(pool, {
        actorId: userId,
        actionType: 'AVAILABILITY_EXCEPTION_DELETED',
        entityType: 'availability_exception',
        entityId: exceptionId,
        metadata: {},
      });

      res.json({ message: 'Exception deleted' });
    } catch (err) {
      console.error('Error deleting availability exception:', err);
      res.status(500).json({ error: 'Failed to delete availability exception' });
    }
  });

  return router;
}
