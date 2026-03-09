import { Router, Response } from 'express';
import type { Pool } from 'pg';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { publishRealtimeEvent } from '../realtime/publisher';
import { UserRole } from '../types/index';

function normalizeRole(role?: string) {
  return String(role || '').toLowerCase();
}

function canUseRequestChat(role?: string) {
  return ['admin', 'doctor', 'nurse'].includes(normalizeRole(role));
}

async function logAudit(
  pool: Pool,
  actorUserId: string | null,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: any
) {
  try {
    await pool.query(
      `INSERT INTO audit_events
       (actor_user_id, action, entity_type, entity_id, metadata, severity, created_at)
       VALUES ($1, $2, $3, $4, $5, 'info', now())`,
      [
        actorUserId,
        action,
        entityType || null,
        entityId || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

export function createRequestChatRouter(pool: Pool) {
  const router = Router();

  router.post(
    '/:requestId/chat/thread',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response) => {
      const userId = req.user?.userId;
      const role = req.user?.role;
      const requestId = req.params.requestId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!canUseRequestChat(role)) {
        res.status(403).json({ error: 'Chat is not enabled for this role' });
        return;
      }

      try {
        const requestResult = await pool.query(
          `SELECT
             cr.id,
             cr.client_id,
             cr.professional_id,
             cr.service_type,
             cr.status,
             cr.urgency,
             cr.address_text,
             cr.preferred_start,
             c.name AS client_name,
             p.name AS professional_name
           FROM care_requests cr
           LEFT JOIN users c ON c.id = cr.client_id
           LEFT JOIN users p ON p.id = cr.professional_id
           WHERE cr.id = $1
           LIMIT 1`,
          [requestId]
        );

        if (requestResult.rows.length === 0) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }

        const requestRow = requestResult.rows[0];
        const isPrivileged = normalizeRole(role) === 'admin';
        const isAssignedClinician =
          String(requestRow.professional_id || '') === String(userId);

        if (!isPrivileged && !isAssignedClinician) {
          res.status(403).json({ error: 'You do not have access to this request thread' });
          return;
        }

        const existingResult = await pool.query(
          `SELECT id
           FROM conversations
           WHERE conversation_type = 'request_thread'
             AND request_id = $1
           LIMIT 1`,
          [requestId]
        );

        if (existingResult.rows.length > 0) {
          res.json({
            success: true,
            data: {
              conversationId: existingResult.rows[0].id,
              requestId,
            },
          });
          return;
        }

        const opsParticipantsResult = await pool.query(
          `SELECT id
           FROM users
           WHERE LOWER(role) = 'admin'
             AND COALESCE(is_active, true) = true`
        );

        const participantIds = new Set<string>();
        participantIds.add(String(userId));
        if (requestRow.professional_id) {
          participantIds.add(String(requestRow.professional_id));
        }
        opsParticipantsResult.rows.forEach((row: any) => {
          participantIds.add(String(row.id));
        });

        const client = await pool.connect();

        try {
          await client.query('BEGIN');

          const conversationResult = await client.query(
            `INSERT INTO conversations (conversation_type, request_id, created_at)
             VALUES ('request_thread', $1, now())
             RETURNING id`,
            [requestId]
          );

          const conversationId = conversationResult.rows[0].id;

          for (const participantId of participantIds) {
            await client.query(
              `INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
               VALUES ($1, $2, now())
               ON CONFLICT (conversation_id, user_id) DO NOTHING`,
              [conversationId, participantId]
            );

            await client.query(
              `INSERT INTO conversation_reads (conversation_id, user_id, last_read_at)
               VALUES ($1, $2, null)
               ON CONFLICT (conversation_id, user_id) DO NOTHING`,
              [conversationId, participantId]
            );
          }

          const systemMessageResult = await client.query(
            `INSERT INTO chat_messages
             (conversation_id, sender_user_id, message_text, message_type, created_at)
             VALUES ($1, $2, $3, 'system', now())
             RETURNING id, created_at`,
            [
              conversationId,
              userId,
              `Request thread created for ${requestRow.service_type || 'care request'}.`,
            ]
          );

          await client.query(
            `INSERT INTO conversation_reads (conversation_id, user_id, last_read_message_id, last_read_at)
             VALUES ($1, $2, $3, now())
             ON CONFLICT (conversation_id, user_id)
             DO UPDATE SET
               last_read_message_id = EXCLUDED.last_read_message_id,
               last_read_at = EXCLUDED.last_read_at`,
            [conversationId, userId, systemMessageResult.rows[0].id]
          );

          await client.query('COMMIT');

          await logAudit(pool, userId, 'REQUEST_CHAT_THREAD_CREATED', 'conversation', conversationId, {
            requestId,
          });

          publishRealtimeEvent({
            type: 'CHAT_MESSAGE_CREATED',
            requestId,
            data: {
              conversationId,
              participantUserIds: Array.from(participantIds),
              message: {
                id: systemMessageResult.rows[0].id,
                conversationId,
                senderUserId: userId,
                senderName: req.user?.name || '',
                senderRole: role || '',
                messageText: `Request thread created for ${requestRow.service_type || 'care request'}.`,
                messageType: 'system',
                createdAt: systemMessageResult.rows[0].created_at,
              },
            },
          });

          res.json({
            success: true,
            data: {
              conversationId,
              requestId,
            },
          });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } catch (err) {
        console.error('Create request thread error:', err);
        res.status(500).json({ error: 'Failed to create request thread' });
      }
    }
  );

  router.get(
    '/:requestId/chat/thread',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response) => {
      const userId = req.user?.userId;
      const requestId = req.params.requestId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      try {
        const result = await pool.query(
          `SELECT
             c.id AS conversation_id,
             c.request_id,
             cr.service_type,
             cr.status,
             cr.urgency,
             cr.address_text,
             cr.preferred_start,
             client_user.name AS client_name,
             pro_user.name AS professional_name
           FROM conversations c
           JOIN care_requests cr ON cr.id = c.request_id
           LEFT JOIN users client_user ON client_user.id = cr.client_id
           LEFT JOIN users pro_user ON pro_user.id = cr.professional_id
           JOIN conversation_participants cp
             ON cp.conversation_id = c.id
            AND cp.user_id = $2
           WHERE c.conversation_type = 'request_thread'
             AND c.request_id = $1
           LIMIT 1`,
          [requestId, userId]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Request thread not found' });
          return;
        }

        res.json({
          success: true,
          data: {
            conversationId: result.rows[0].conversation_id,
            requestId: result.rows[0].request_id,
            serviceType: result.rows[0].service_type,
            status: result.rows[0].status,
            urgency: result.rows[0].urgency,
            addressText: result.rows[0].address_text,
            preferredStart: result.rows[0].preferred_start,
            clientName: result.rows[0].client_name,
            professionalName: result.rows[0].professional_name,
          },
        });
      } catch (err) {
        console.error('Get request thread error:', err);
        res.status(500).json({ error: 'Failed to load request thread' });
      }
    }
  );

  router.get(
    '/:requestId/chat/messages',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response) => {
      const userId = req.user?.userId;
      const requestId = req.params.requestId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      try {
        const conversationResult = await pool.query(
          `SELECT c.id
           FROM conversations c
           JOIN conversation_participants cp
             ON cp.conversation_id = c.id
            AND cp.user_id = $2
           WHERE c.conversation_type = 'request_thread'
             AND c.request_id = $1
           LIMIT 1`,
          [requestId, userId]
        );

        if (conversationResult.rows.length === 0) {
          res.status(404).json({ error: 'Request thread not found' });
          return;
        }

        const conversationId = conversationResult.rows[0].id;

        const messagesResult = await pool.query(
          `SELECT
             cm.id,
             cm.conversation_id,
             cm.sender_user_id,
             u.name AS sender_name,
             u.role AS sender_role,
             cm.message_text,
             cm.message_type,
             cm.created_at
           FROM chat_messages cm
           JOIN users u ON u.id = cm.sender_user_id
           WHERE cm.conversation_id = $1
           ORDER BY cm.created_at ASC`,
          [conversationId]
        );

        await pool.query(
          `INSERT INTO conversation_reads (conversation_id, user_id, last_read_message_id, last_read_at)
           VALUES (
             $1,
             $2,
             (SELECT id FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1),
             now()
           )
           ON CONFLICT (conversation_id, user_id)
           DO UPDATE SET
             last_read_message_id = EXCLUDED.last_read_message_id,
             last_read_at = EXCLUDED.last_read_at`,
          [conversationId, userId]
        );

        res.json({
          success: true,
          data: {
            conversationId,
            messages: messagesResult.rows.map((row: any) => ({
              id: row.id,
              conversationId: row.conversation_id,
              senderUserId: row.sender_user_id,
              senderName: row.sender_name,
              senderRole: row.sender_role,
              messageText: row.message_text,
              messageType: row.message_type,
              createdAt: row.created_at,
            })),
          },
        });
      } catch (err) {
        console.error('Get request thread messages error:', err);
        res.status(500).json({ error: 'Failed to load request messages' });
      }
    }
  );

  router.post(
    '/:requestId/chat/messages',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response) => {
      const userId = req.user?.userId;
      const role = req.user?.role;
      const requestId = req.params.requestId;
      const messageText = String(req.body?.messageText || '').trim();

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!messageText) {
        res.status(400).json({ error: 'messageText is required' });
        return;
      }

      try {
        const conversationResult = await pool.query(
          `SELECT c.id
           FROM conversations c
           JOIN conversation_participants cp
             ON cp.conversation_id = c.id
            AND cp.user_id = $2
           WHERE c.conversation_type = 'request_thread'
             AND c.request_id = $1
           LIMIT 1`,
          [requestId, userId]
        );

        if (conversationResult.rows.length === 0) {
          res.status(404).json({ error: 'Request thread not found' });
          return;
        }

        const conversationId = conversationResult.rows[0].id;

        const participantUsersResult = await pool.query(
          `SELECT user_id
           FROM conversation_participants
           WHERE conversation_id = $1`,
          [conversationId]
        );

        const insertedResult = await pool.query(
          `INSERT INTO chat_messages
           (conversation_id, sender_user_id, message_text, message_type, created_at)
           VALUES ($1, $2, $3, 'text', now())
           RETURNING *`,
          [conversationId, userId, messageText]
        );

        await pool.query(
          `INSERT INTO conversation_reads (conversation_id, user_id, last_read_message_id, last_read_at)
           VALUES ($1, $2, $3, now())
           ON CONFLICT (conversation_id, user_id)
           DO UPDATE SET
             last_read_message_id = EXCLUDED.last_read_message_id,
             last_read_at = EXCLUDED.last_read_at`,
          [conversationId, userId, insertedResult.rows[0].id]
        );

        const senderResult = await pool.query(
          `SELECT name, role
           FROM users
           WHERE id = $1
           LIMIT 1`,
          [userId]
        );

        const sender = senderResult.rows[0];
        const participantUserIds = participantUsersResult.rows.map((row: any) => String(row.user_id));

        publishRealtimeEvent({
          type: 'CHAT_MESSAGE_CREATED',
          requestId,
          data: {
            conversationId,
            participantUserIds,
            message: {
              id: insertedResult.rows[0].id,
              conversationId: insertedResult.rows[0].conversation_id,
              senderUserId: insertedResult.rows[0].sender_user_id,
              senderName: sender?.name || '',
              senderRole: sender?.role || role || '',
              messageText: insertedResult.rows[0].message_text,
              messageType: insertedResult.rows[0].message_type,
              createdAt: insertedResult.rows[0].created_at,
            },
          },
        });

        await logAudit(pool, userId, 'REQUEST_CHAT_MESSAGE_SENT', 'conversation', conversationId, {
          requestId,
          messageId: insertedResult.rows[0].id,
        });

        res.json({
          success: true,
          data: {
            id: insertedResult.rows[0].id,
            conversationId: insertedResult.rows[0].conversation_id,
            senderUserId: insertedResult.rows[0].sender_user_id,
            senderName: sender?.name || '',
            senderRole: sender?.role || role || '',
            messageText: insertedResult.rows[0].message_text,
            messageType: insertedResult.rows[0].message_type,
            createdAt: insertedResult.rows[0].created_at,
          },
        });
      } catch (err) {
        console.error('Send request thread message error:', err);
        res.status(500).json({ error: 'Failed to send request message' });
      }
    }
  );

  return router;
}
