import type { Pool } from "pg";

export type AssistantAction =
  | { type: "SET_TAB"; tab: "queued" | "offered" | "accepted" | "en_route" | "completed" | "cancelled" }
  | { type: "SET_SEARCH"; query: string }
  | { type: "OPEN_REQUEST"; requestId: string }
  | { type: "REFRESH_DASHBOARD" }
  | { type: "NAVIGATE"; path: string };

type AssistantCtx = {
  message: string;
  userId: string;
  role: "admin" | "nurse" | "doctor" | "client";
};

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((k) => text.includes(k));
}

// Extract UUID/ID-like string (8-char hex prefix)
function extractIdLike(text: string) {
  const m = text.match(/\b([0-9a-f]{8})([0-9a-f-]{0,})\b/i);
  return m?.[0] || null;
}

async function safeStats(pool: Pool) {
  try {
    const statusCounts = await pool.query(
      `SELECT status, COUNT(*)::int AS n FROM care_requests GROUP BY status`
    );
    const byStatus: Record<string, number> = {};
    for (const r of statusCounts.rows) {
      byStatus[String(r.status).toLowerCase()] = r.n;
    }

    return {
      queued: byStatus.queued || 0,
      offered: byStatus.offered || 0,
      accepted: byStatus.accepted || 0,
      en_route: byStatus.en_route || 0,
      completed: byStatus.completed || 0,
      cancelled: byStatus.cancelled || 0,
    };
  } catch (err) {
    console.error("Error fetching stats for assistant:", err);
    return {
      queued: 0,
      offered: 0,
      accepted: 0,
      en_route: 0,
      completed: 0,
      cancelled: 0,
    };
  }
}

export async function buildAssistantResponse(
  pool: Pool,
  ctx: AssistantCtx
): Promise<{ answer: string; actions: AssistantAction[] }> {
  const text = normalize(ctx.message);
  const actions: AssistantAction[] = [];

  // ---- Quick navigation / filters
  if (includesAny(text, ["show queued", "queued requests", "queued only", "queued"])) {
    actions.push({ type: "SET_TAB", tab: "queued" });
    actions.push({ type: "REFRESH_DASHBOARD" });
    return {
      answer: "Switched you to **Queued**. These are waiting for dispatch.",
      actions,
    };
  }

  if (includesAny(text, ["show offered", "offered requests", "offered only", "offered"])) {
    actions.push({ type: "SET_TAB", tab: "offered" });
    actions.push({ type: "REFRESH_DASHBOARD" });
    return {
      answer: "Switched you to **Offered**. Watch the countdown timers.",
      actions,
    };
  }

  if (includesAny(text, ["show accepted", "accepted requests", "accepted only", "accepted"])) {
    actions.push({ type: "SET_TAB", tab: "accepted" });
    actions.push({ type: "REFRESH_DASHBOARD" });
    return {
      answer: "Switched you to **Accepted**. These are confirmed visits.",
      actions,
    };
  }

  if (includesAny(text, ["en route", "en_route", "in progress"])) {
    actions.push({ type: "SET_TAB", tab: "en_route" });
    actions.push({ type: "REFRESH_DASHBOARD" });
    return {
      answer: "Switched you to **En Route**. These are in progress.",
      actions,
    };
  }

  if (includesAny(text, ["show completed", "completed only", "completed"])) {
    actions.push({ type: "SET_TAB", tab: "completed" });
    actions.push({ type: "REFRESH_DASHBOARD" });
    return {
      answer: "Switched you to **Completed**.",
      actions,
    };
  }

  if (includesAny(text, ["show cancelled", "cancelled only", "cancelled", "canceled"])) {
    actions.push({ type: "SET_TAB", tab: "cancelled" });
    actions.push({ type: "REFRESH_DASHBOARD" });
    return {
      answer: "Switched you to **Cancelled**.",
      actions,
    };
  }

  // ---- Search
  if (text.startsWith("search ")) {
    const q = ctx.message.slice(7).trim();
    if (q) {
      actions.push({ type: "SET_SEARCH", query: q });
      return {
        answer: `Searching for: **${q}**`,
        actions,
      };
    }
  }

  // ---- Open request by ID/prefix
  if (includesAny(text, ["open request", "view request", "open"])) {
    const idLike = extractIdLike(ctx.message);
    if (idLike) {
      actions.push({ type: "OPEN_REQUEST", requestId: idLike });
      return {
        answer: `Opening request **${idLike}**…`,
        actions,
      };
    }
  }

  // ---- Stats
  if (includesAny(text, ["stats", "system stats", "overview", "how many"])) {
    const s = await safeStats(pool);
    return {
      answer:
        `Snapshot:\n` +
        `• Queued: ${s.queued}\n` +
        `• Offered: ${s.offered}\n` +
        `• Accepted: ${s.accepted}\n` +
        `• En route: ${s.en_route}\n` +
        `• Completed: ${s.completed}\n` +
        `• Cancelled: ${s.cancelled}`,
      actions: [],
    };
  }

  // ---- Integrations navigation
  if (includesAny(text, ["integrations", "api keys", "webhooks"])) {
    actions.push({ type: "NAVIGATE", path: "/integrations" });
    return {
      answer: "Taking you to **Integrations** (API Keys & Webhooks).",
      actions,
    };
  }

  // ---- Statuses explanation
  if (includesAny(text, ["statuses", "status", "what does", "meaning"])) {
    return {
      answer: [
        `Request lifecycle:`,
        `• **queued** → created and waiting for dispatch`,
        `• **offered** → time-limited offer sent to a nurse/doctor`,
        `• **accepted** → professional accepted the offer`,
        `• **en_route** → professional is on the way`,
        `• **completed** → visit finished`,
        `• **cancelled** → request withdrawn`,
        ``,
        `Tip: "offered" always has an expiry timer. If it expires, it returns to queued.`,
      ].join("\n"),
      actions: [],
    };
  }

  // ---- Manual offer instructions (Admin only)
  if (includesAny(text, ["manual offer", "offer to", "send offer", "assign"])) {
    if (ctx.role !== "admin") {
      return {
        answer: `Only Admin/Dispatcher users can send manual offers. If you need access, use "Request access" on the login page.`,
        actions: [],
      };
    }

    return {
      answer: [
        `Manual Offer (Admin):`,
        `1) Go to **Queued** tab`,
        `2) Click "View" on a request`,
        `3) Select a Nurse/Doctor in the dropdown`,
        `4) Click "Send Offer"`,
        ``,
        `The request becomes "offered" and a countdown starts. The professional can accept/decline.`,
      ].join("\n"),
      actions: [],
    };
  }

  // ---- Troubleshoot
  if (includesAny(text, ["stuck", "offered", "not moving", "why stuck"])) {
    return {
      answer: [
        `If a request is stuck in "offered":`,
        ``,
        `1) **Offer expiry** — Dispatch Worker might not be running`,
        `2) **SSE disconnect** — Refresh the page (click Refresh in Assistant)`,
        `3) **Active offer** — Check the database for non-expired visit_assignments`,
        ``,
        `Try: **"Refresh dashboard"** to sync state.`,
      ].join("\n"),
      actions: [],
    };
  }

  // ---- Default help
  return {
    answer: [
      `I can **navigate the queue**, **open requests**, and **search**.`,
      ``,
      `Try:`,
      `• "Show queued"`,
      `• "Show offered"`,
      `• "Show completed"`,
      `• "Open request 61b6ffcd"`,
      `• "How do I manually offer?"`,
    ].join("\n"),
    actions: [],
  };
}
