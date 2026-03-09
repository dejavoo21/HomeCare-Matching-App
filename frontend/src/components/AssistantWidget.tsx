import { useEffect, useMemo, useRef, useState } from "react";
import { X, MessageCircle, Send, Bot, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAssistantActions } from "../contexts/AssistantActionsContext";
import { useCommunication } from "../contexts/CommunicationContext";
import { ChatDrawer } from "./ChatDrawer";
import type { AssistantAction } from "../types/assistant";

type Msg = { role: "assistant" | "user"; text: string; ts: number };

const LS_KEY = "assistant_widget_state_v1";

function loadState(): { open: boolean; dismissed: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { open: true, dismissed: false };
    return JSON.parse(raw);
  } catch {
    return { open: true, dismissed: false };
  }
}

function saveState(state: { open: boolean; dismissed: boolean }) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function AssistantWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [input, setInput] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => [
    {
      role: "assistant",
      text: "I can help with queue status, request lookup, dispatch actions, and workflow questions.",
      ts: Date.now(),
    },
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const runActions = useAssistantActions();
  const { summary } = useCommunication();

  useEffect(() => {
    const state = loadState();
    setOpen(state.open && !state.dismissed);
    setDismissed(state.dismissed);
  }, []);

  useEffect(() => {
    saveState({ open, dismissed });
  }, [open, dismissed]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const pageSuggestions = useMemo(() => {
    if (location.pathname.includes('/admin/dispatch')) {
      return ['Show critical requests', 'Open unread conversations', 'Who is available right now?'];
    }
    if (location.pathname.includes('/admin/scheduling')) {
      return ['Show unassigned visits', 'Who is overloaded today?', 'Open workforce chat'];
    }
    return ['Who is on shift now?', 'Open unread conversations', 'Show active clinicians'];
  }, [location.pathname]);

  const communicationSuggestions = useMemo(
    () =>
      [
        summary.unreadMessages > 0
          ? `You have ${summary.unreadMessages} unread chat messages`
          : null,
        summary.workforcePresence.inVisit > 0
          ? `${summary.workforcePresence.inVisit} clinicians are currently in visits`
          : null,
        summary.workforcePresence.busy > 0
          ? `${summary.workforcePresence.busy} clinicians are marked busy`
          : null,
        summary.workforcePresence.onShift > 0
          ? `${summary.workforcePresence.onShift} clinicians are on shift`
          : null,
      ].filter(Boolean) as string[],
    [summary]
  );

  const quickActions = useMemo(
    () => [
      ...communicationSuggestions.slice(0, 2),
      ...pageSuggestions,
      'How do I manually offer?',
    ].slice(0, 5),
    [communicationSuggestions, pageSuggestions]
  );

  const runAssistantShortcut = async (prompt: string) => {
    const normalized = prompt.toLowerCase();

    if (normalized.includes('unread chat') || normalized.includes('open unread conversations') || normalized.includes('open workforce chat')) {
      setChatOpen(true);
      return;
    }

    if (normalized.includes('on shift') || normalized.includes('available right now') || normalized.includes('active clinicians') || normalized.includes('in visits') || normalized.includes('busy')) {
      navigate('/admin/team');
      return;
    }

    if (normalized.includes('unassigned visits') || normalized.includes('overloaded today')) {
      navigate('/admin/scheduling');
      return;
    }

    if (normalized.includes('critical requests')) {
      navigate('/admin/dispatch');
      return;
    }

    await send(prompt);
  };

  const send = async (text: string) => {
    const query = text.trim();
    if (!query || busy) return;

    setMessages((current) => [...current, { role: "user", text: query, ts: Date.now() }]);
    setInput("");
    setBusy(true);

    try {
      const res: any = await api.assistantQuery(query);
      const answer = res?.data?.answer || "Sorry, I couldn't generate a response.";
      setMessages((current) => [
        ...current,
        { role: "assistant", text: answer, ts: Date.now() },
      ]);

      const actions: AssistantAction[] = res?.data?.actions || [];
      if (actions.length) {
        runActions(actions);
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "I hit an error talking to the server. Try again.",
          ts: Date.now(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setDismissed(true);
  };

  const handleToggle = () => {
    setOpen((current) => !current);
    if (!open) {
      setDismissed(false);
    }
  };

  return (
    <div className="assistantRoot">
      {open ? (
        <section className="assistantPanel" role="dialog" aria-label="Assistant chat">
          <div className="assistantHeader">
            <div className="assistantTitleGroup">
              <span className="assistantBadge">
                <Bot size={16} />
              </span>
              <div className="assistantTitle">
                <span className="assistantTitleMain">Operations Assistant</span>
                <span className="assistantSub">Queue guidance and quick answers</span>
              </div>
            </div>

            <button
              className="assistantIconButton"
              onClick={handleClose}
              aria-label="Close assistant"
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          <div className="assistantIntro">
            <Sparkles size={14} />
            <span>Ask about dispatch workflow, unread chats, workforce presence, or admin actions.</span>
          </div>

          <div className="assistantQuick">
            {quickActions.map((action) => (
              <button
                key={action}
                className="assistantChip"
                onClick={() => {
                  void runAssistantShortcut(action);
                }}
                type="button"
              >
                {action}
              </button>
            ))}
          </div>

          <div className="assistantList" ref={listRef}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "assistantMessageRow assistantMessageRow-user"
                    : "assistantMessageRow assistantMessageRow-bot"
                }
              >
                <div
                  className={
                    message.role === "user"
                      ? "assistantBubble assistantBubble-user"
                      : "assistantBubble assistantBubble-bot"
                  }
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <div className="assistantComposer">
            <input
              className="assistantInput"
              placeholder="Ask about queue status, unread chat, or staff availability..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void send(input);
                }
              }}
              disabled={busy}
            />
            <button
              className="assistantSend"
              onClick={() => {
                void send(input);
              }}
              disabled={busy}
              type="button"
            >
              <Send size={16} />
            </button>
          </div>
        </section>
      ) : (
        <button className="assistantFab" onClick={handleToggle} aria-label="Open assistant" type="button">
          <MessageCircle size={18} />
          <span>Assistant</span>
        </button>
      )}

      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
