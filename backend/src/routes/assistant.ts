import { Router, Response } from "express";
import type { Pool } from "pg";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { buildAssistantResponse } from "../services/assistant.service";

export function createAssistantRouter(pool: Pool) {
  const router = Router();

  /**
   * POST /assistant/query
   * Body: { message: string }
   * Requires auth (so we can tailor guidance to role)
   * Returns: { success, data: { answer, actions } }
   */
  router.post(
    "/query",
    authMiddleware,
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const message = String(req.body?.message || "").trim();
        if (!message) {
          res.status(400).json({ error: "message is required" });
          return;
        }

        const user = req.user!;
        const { answer, actions } = await buildAssistantResponse(pool, {
          message,
          userId: user.userId,
          role: user.role as "admin" | "nurse" | "doctor" | "client",
        });

        res.json({
          success: true,
          data: { answer, actions },
        });
      } catch (err) {
        console.error("Assistant query error:", err);
        res.status(500).json({ error: "Assistant failed to respond" });
      }
    }
  );

  return router;
}
