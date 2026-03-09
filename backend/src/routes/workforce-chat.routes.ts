import { Router, Response } from 'express';
import type { Pool } from 'pg';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { publishRealtimeEvent } from '../realtime/publisher';
import { UserRole } from '../types/index';

function normalizeRole(role?: string) {
  return String(role || '').toLowerCase();
}

function canUseChat(role?: string) {
  return ['admin', 'doctor', 'nurse'].includes(normalizeRole(role));
}

function canDirectMessage(senderRole?: string, recipientRole?: string) {
  const sender = normalizeRole(senderRole);
  const recipient = normalizeRole(recipientRole);

  if (sender === 'admin') {
    return ['admin', 'doctor', 'nurse'].includes(recipient);
  }

  if (sender === 'doctor' || sender === 'nurse') {
    return recipient === 'admin';
  }

  return false;
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

export function createWorkforceChatRouter(pool: Pool) {
  const router = Router();

  router.post(
    '/direct',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response) => {
      const senderId = req.user?.userId;
      const senderRole = req.user?.role;
      const recipientUserId = String(req.body?.recipientUserId || '').trim();

      if (!senderId || !recipientUserId) {
        res.status(400).json({ error: 'recipientUserId is required' });
        return;
      }

      if (!canUseChat(senderRole)) {
        res.status(403).json({ error: 'Chat is not enabled for this role' });
        return;
      }

      try {
        const recipientResult = await pool.query(
          `SELECT id, role
           FROM users
           WHERE id = $1
           LIMIT 1`,
          [recipientUserId]
        );

        if (recipientResult.rows.length === 0) {
          res.status(404).json({ error: 'Recipient not found' });
          return;
        }

        const recipient = recipientResult.rows[0];

        if (!canDirectMessage(senderRole, recipient.role)) {
          res.status(403).json({ error: 'Direct messaging is not allowed for these roles' });
          return;
        }

        const existingResult = await pool.query(
          `SELECT c.id
           FROM conversations c
           JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
           JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
           WHERE c.conversation_type = 'direct'
             AND cp1.user_id = $1
             AND cp2.user_id = $2
           LIMIT 1`,
          [senderId, recipientUserId]
        );

        if (existingResult.rows.length > 0) {
          res.json({
            success: true,
            data: {
              conversationId: existingResult.rows[0].id,
            },
          });
          return;
        }

        const client = await pool.connect();

        try {
          await client.query('BEGIN');

          const conversationResult = await client.query(
            `INSERT INTO conversations (conversation_type, created_at)
             VALUES ('direct', now())
             RETURNING id`
          );

          const conversationId = conversationResult.rows[0].id;

          await client.query(
            `INSERT INTO conversation_participants (conversation_id, user_id)
             VALUES ($1, $2), ($1, $3)`,
            [conversationId, senderId, recipientUserId]
          );

          await client.query(
            `INSERT INTO conversation_reads (conversation_id, user_id, last_read_at)
             VALUES ($1, $2, now()), ($1, $3, null)`,
            [conversationId, senderId, recipientUserId]
          );

          await client.query('COMMIT');

          await logAudit(pool, senderId, 'CHAT_DIRECT_CONVERSATION_CREATED', 'conversation', conversationId, {
            recipientUserId,
          });

          res.json({
            success: true,
            data: {
              conversationId,
            },
          });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } catch (err) {
        console.error('Create/get direct conversation error:', err);
        res.status(500).json({ error: 'Failed to start direct chat' });
      }
    }
  );

  router.get(
    '/conversations',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response) => {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      try {
        const result = await pool.query(
          `SELECT
             c.id,
             c.conversation_type,
             c.created_at,
             other_user.id AS other_user_id,
             other_user.name AS other_user_name,
             other_user.email AS other_user_email,
             other_user.role AS other_user_role,
             COALESCE(up.presence_status, 'offline') AS other_user_presence,
             last_msg.id AS last_message_id,
             last_msg.message_text AS last_message_text,
             last_msg.created_at AS last_message_at,
             last_msg.sender_user_id AS last_message_sender_id,
             COALESCE(unread.unread_count, 0) AS unread_count
           FROM conversations c
           JOIN conversation_participants my_cp
             ON my_cp.conversation_id = c.id
            AND my_cp.user_id = $1
           JOIN conversation_participants other_cp
             ON other_cp.conversation_id = c.id
            AND other_cp.user_id <> $1
           JOIN users other_user
             ON other_user.id = other_cp.user_id
           LEFT JOIN user_presence up
             ON up.user_id = other_user.id
           LEFT JOIN LATERAL (
             SELECT cm.id, cm.message_text, cm.created_at, cm.sender_user_id
             FROM chat_messages cm
             WHERE cm.conversation_id = c.id
             ORDER BY cm.created_at DESC
             LIMIT 1
           ) last_msg ON true
           LEFT JOIN LATERAL (
             SELECT COUNT(*)::int AS unread_count
             FROM chat_messages cm
             LEFT JOIN conversation_reads cr
               ON cr.conversation_id = c.id
              AND cr.user_id = $1
             WHERE cm.conversation_id = c.id
               AND (
                 cr.last_read_at IS NULL
                 OR cm.created_at > cr.last_read_at
               )
               AND cm.sender_user_id <> $1
           ) unread ON true
           WHERE c.conversation_type = 'direct'
           ORDER BY COALESCE(last_msg.created_at, c.created_at) DESC`,
          [userId]
        );

        res.json({
          success: true,
          data: result.rows.map((row: any) => ({
            id: row.id,
            conversationType: row.conversation_type,
            otherUser: {
              id: row.other_user_id,
              name: row.other_user_name,
              email: row.other_user_email,
              role: row.other_user_role,
              presenceStatus: row.other_user_presence || 'offline',
            },
            lastMessage: row.last_message_id
              ? {
                  id: row.last_message_id,
                  text: row.last_message_text,
                  createdAt: row.last_message_at,
                  senderUserId: row.last_message_sender_id,
                }
              : null,
            unreadCount: Number(row.unread_count || 0),
          })),
        });
      } catch (err) {
        console.error('List conversations error:', err);
        res.status(500).json({ error: 'Failed to load conversations' });
      }
    }
  );

  router.get(
    '/conversations/:id/messages',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response) => {
      const userId = req.user?.userId;
      const conversationId = req.params.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      try {
        const participantResult = await pool.query(
          `SELECT 1
           FROM conversation_participants
           WHERE conversation_id = $1
             AND user_id = $2
           LIMIT 1`,
          [conversationId, userId]
        );

        if (participantResult.rows.length === 0) {
          res.status(403).json({ error: 'Not a participant in this conversation' });
          return;
        }

        const result = await pool.query(
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
           JOIN users u
             ON u.id = cm.sender_user_id
           WHERE cm.conversation_id = $1
           ORDER BY cm.created_at ASC`,
          [conversationId]
        );

        res.json({
          success: true,
          data: result.rows.map((row: any) => ({
            id: row.id,
            conversationId: row.conversation_id,
            senderUserId: row.sender_user_id,
            senderName: row.sender_name,
            senderRole: row.sender_role,
            messageText: row.message_text,
            messageType: row.message_type,
            createdAt: row.created_at,
          })),
        });
      } catch (err) {
        console.error('List messages error:', err);
        res.status(500).json({ error: 'Failed to load messages' });
      }
    }
  );

  router.post(
    '/conversations/:id/messages',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response) => {
      const userId = req.user?.userId;
      const conversationId = req.params.id;
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
        const participantResult = await pool.query(
          `SELECT 1
           FROM conversation_participants
           WHERE conversation_id = $1
             AND user_id = $2
           LIMIT 1`,
          [conversationId, userId]
        );

        if (participantResult.rows.length === 0) {
          res.status(403).json({ error: 'Not a participant in this conversation' });
          return;
        }

        const senderResult = await pool.query(
          `SELECT name, role
           FROM users
           WHERE id = $1
           LIMIT 1`,
          [userId]
        );

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

        const inserted = insertedResult.rows[0];

        await pool.query(
          `INSERT INTO conversation_reads (conversation_id, user_id, last_read_message_id, last_read_at)
           VALUES ($1, $2, $3, now())
           ON CONFLICT (conversation_id, user_id)
           DO UPDATE SET
             last_read_message_id = EXCLUDED.last_read_message_id,
             last_read_at = EXCLUDED.last_read_at`,
          [conversationId, userId, inserted.id]
        );

        const sender = senderResult.rows[0];
        const participantUserIds = participantUsersResult.rows.map((row: any) => String(row.user_id));

        publishRealtimeEvent({
          type: 'CHAT_MESSAGE_CREATED',
          data: {
            conversationId,
            participantUserIds,
            message: {
              id: inserted.id,
              conversationId: inserted.conversation_id,
              senderUserId: inserted.sender_user_id,
              senderName: sender?.name || '',
              senderRole: sender?.role || '',
              messageText: inserted.message_text,
              messageType: inserted.message_type,
              createdAt: inserted.created_at,
            },
          },
        });

        await logAudit(pool, userId, 'CHAT_MESSAGE_SENT', 'conversation', conversationId, {
          messageId: inserted.id,
        });

        res.json({
          success: true,
          data: {
            id: inserted.id,
            conversationId: inserted.conversation_id,
            senderUserId: inserted.sender_user_id,
            senderName: sender?.name || '',
            senderRole: sender?.role || '',
            messageText: inserted.message_text,
            messageType: inserted.message_type,
            createdAt: inserted.created_at,
          },
        });
      } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Failed to send message' });
      }
    }
  );

  router.post(
    '/conversations/:id/read',
    authMiddleware,
    requireRole(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE),
    async (req: AuthRequest, res: Response) => {
      const userId = req.user?.userId;
      const conversationId = req.params.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      try {
        const participantResult = await pool.query(
          `SELECT 1
           FROM conversation_participants
           WHERE conversation_id = $1
             AND user_id = $2
           LIMIT 1`,
          [conversationId, userId]
        );

        if (participantResult.rows.length === 0) {
          res.status(403).json({ error: 'Not a participant in this conversation' });
          return;
        }

        const lastMessageResult = await pool.query(
          `SELECT id
           FROM chat_messages
           WHERE conversation_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
          [conversationId]
        );

        const participantUsersResult = await pool.query(
          `SELECT user_id
           FROM conversation_participants
           WHERE conversation_id = $1`,
          [conversationId]
        );

        const lastMessageId = lastMessageResult.rows[0]?.id || null;

        await pool.query(
          `INSERT INTO conversation_reads (conversation_id, user_id, last_read_message_id, last_read_at)
           VALUES ($1, $2, $3, now())
           ON CONFLICT (conversation_id, user_id)
           DO UPDATE SET
             last_read_message_id = EXCLUDED.last_read_message_id,
             last_read_at = EXCLUDED.last_read_at`,
          [conversationId, userId, lastMessageId]
        );

        publishRealtimeEvent({
          type: 'CHAT_READ_UPDATED',
          data: {
            conversationId,
            userId,
            participantUserIds: participantUsersResult.rows.map((row: any) => String(row.user_id)),
          },
        });

        res.json({ success: true });
      } catch (err) {
        console.error('Mark conversation read error:', err);
        res.status(500).json({ error: 'Failed to update read state' });
      }
    }
  );

  return router;
}
