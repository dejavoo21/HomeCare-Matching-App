import { useEffect, useMemo, useRef, useState } from "react";
import { X, MessageCircle, Send, Bot } from "lucide-react";
import { api } from "../services/api";
import { useAssistantActions } from "../contexts/AssistantActionsContext";
import type { AssistantAction } from "../types/assistant";

type Msg = { role: "assistant" | "user"; text: string; ts: number };

const LS_KEY = "assistant_widget_state_v1"; // { open: boolean, dismissed: boolean }

function loadState(): { open: boolean; dismissed: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { open: true, dismissed: false }; // auto-open default
    return JSON.parse(raw);
  } catch {
    return { open: true, dismissed: false };
  }
}

function saveState(state: { open: boolean; dismissed: boolean }) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => [
    {
      role: "assistant",
      text: "Hi 👋 I can help you navigate the queue, switch views, and open requests. What do you need?",
      ts: Date.now(),
    },
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const runActions = useAssistantActions();

  useEffect(() => {
    const s = loadState();
    setOpen(s.open && !s.dismissed);
    setDismissed(s.dismissed);
  }, []);

  useEffect(() => {
    saveState({ open, dismissed });
  }, [open, dismissed]);

  useEffect(() => {
    // auto scroll
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const quickActions = useMemo(
    () => [
      "Show queued",
      "Show offered",
      "Show completed",
      "How do I manually offer?",
    ],
    []
  );

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;

    setMessages((m) => [...m, { role: "user", text: q, ts: Date.now() }]);
    setInput("");
    setBusy(true);

    try {
      const res: any = await api.assistantQuery(q);
      const answer = res?.data?.answer || "Sorry — I couldn't generate a response.";
      setMessages((m) => [...m, { role: "assistant", text: answer, ts: Date.now() }]);

      const actions: AssistantAction[] = res?.data?.actions || [];
      if (actions.length) {
        runActions(actions);
      }
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "I hit an error talking to the server. Try again.", ts: Date.now() },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setDismissed(true); // prevents auto-open next time
  };

  const handleToggle = () => {
    setOpen((v) => !v);
    if (!open) setDismissed(false); // if user reopens, it's not dismissed anymore
  };

  return (
    <div className="assistantRoot">
      {open ? (
        <div className="assistantPanel" role="dialog" aria-label="Assistant chat">
          <div className="assistantHeader">
            <div className="assistantTitle">
              <span className="assistantBadge">
                <Bot size={16} />
              </span>
              Assistant
              <span className="assistantSub">Guided help</span>
            </div>

            <button className="iconBtn" onClick={handleClose} aria-label="Close assistant">
              <X size={18} />
            </button>
          </div>

          <div className="assistantQuick">
            {quickActions.slice(0, 3).map((q) => (
              <button key={q} className="chip" onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>

          <div className="assistantList" ref={listRef}>
            {messages.map((m, idx) => (
              <div key={idx} className={m.role === "user" ? "msg msgUser" : "msg msgBot"}>
                <div className="msgBubble">{m.text}</div>
              </div>
            ))}
          </div>

          <div className="assistantComposer">
            <input
              className="assistantInput"
              placeholder="Ask me anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send(input);
              }}
              disabled={busy}
            />
            <button className="assistantSend" onClick={() => send(input)} disabled={busy}>
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button className="assistantFab" onClick={handleToggle} aria-label="Open assistant">
          <MessageCircle size={18} />
          <span>Assistant</span>
        </button>
      )}
    </div>
  );
}
