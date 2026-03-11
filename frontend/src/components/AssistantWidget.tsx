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
    if (location.pathname.match(/\/admin\/requests\/[^/]+$/)) {
      return [
        'Summarize this request',
        'Explain service risk',
        'Show next actions',
        'Summarize timeline',
      ];
    }
    if (location.pathname.includes('/admin/requests')) {
      return [
        'Summarize queued requests',
        'Show critical items',
        'Explain queue backlog',
        'Recommend next queue actions',
      ];
    }
    if (location.pathname.includes('/admin/integrations') && !location.pathname.includes('/admin/integrations/reliability') && !location.pathname.includes('/admin/integrations/fhir')) {
      return [
        'Summarize connector health',
        'Show systems with warnings',
        'Explain sync posture',
      ];
    }
    if (location.pathname.includes('/admin/integrations/reliability')) {
      return [
        'Summarize service health',
        'Explain queue backlog',
        'Show reliability concerns',
      ];
    }
    if (location.pathname.includes('/admin/integrations/fhir')) {
      return [
        'Summarize FHIR readiness',
        'Show supported resources',
        'Explain interoperability posture',
      ];
    }
    if (location.pathname.includes('/admin/analytics')) {
      return [
        'Summarize operational trends',
        'Explain performance risks',
        'Recommend actions from analytics',
      ];
    }
    if (location.pathname.includes('/admin/unresolved-items')) {
      return [
        'Show critical unresolved items',
        'Which items have no owner?',
        'Show oldest blockers',
      ];
    }
    if (location.pathname.includes('/admin/escalations')) {
      return [
        'Show critical escalations',
        'Which escalations have no owner?',
        'Show aged escalations',
      ];
    }
    if (location.pathname.includes('/admin/release-readiness')) {
      return [
        'Summarize release posture',
        'Show watch items',
        'Which gaps remain open?',
      ];
    }
    if (location.pathname.includes('/admin/audit')) {
      return [
        'Summarize recent audit events',
        'Explain traceability posture',
        'Show controlled workflow actions',
      ];
    }
    if (location.pathname.includes('/admin/dashboard')) {
      return [
        "Summarize today's priorities",
        'Show open exceptions',
        'Explain coverage health',
      ];
    }
    if (location.pathname.includes('/admin/access')) {
      return [
        'Show blocked onboarding requests',
        'Summarize pending verifications',
        'Draft request for missing documents',
      ];
    }
    if (location.pathname.includes('/admin/dispatch')) {
      return ['Show critical requests', 'Open unread conversations', 'Who is available right now?'];
    }
    if (location.pathname.includes('/admin/scheduling')) {
      return [
        'Show unassigned visits',
        'Explain conflict risk',
        'Summarize authorization warnings',
      ];
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

  const proactiveAlerts = useMemo(() => {
    const alerts: string[] = [];

    if (summary.unreadMessages > 0) {
      alerts.push(`${summary.unreadMessages} unread chat message${summary.unreadMessages === 1 ? '' : 's'} need review`);
    }
    if (summary.workforcePresence.inVisit > 0) {
      alerts.push(`${summary.workforcePresence.inVisit} clinician${summary.workforcePresence.inVisit === 1 ? '' : 's'} currently in visit`);
    }
    if (summary.workforcePresence.busy > 0) {
      alerts.push(`${summary.workforcePresence.busy} clinician${summary.workforcePresence.busy === 1 ? '' : 's'} marked busy`);
    }

    return alerts.slice(0, 3);
  }, [summary]);

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

    if (
      normalized.includes('this request') ||
      normalized.includes('service risk') ||
      normalized.includes('next actions') ||
      normalized.includes('timeline')
    ) {
      return;
    }

    if (
      normalized.includes('queued requests') ||
      normalized.includes('critical items') ||
      normalized.includes('queue backlog') ||
      normalized.includes('queue actions')
    ) {
      navigate('/admin/requests');
      return;
    }

    if (
      normalized.includes('connector health') ||
      normalized.includes('systems with warnings') ||
      normalized.includes('sync posture')
    ) {
      navigate('/admin/integrations');
      return;
    }

    if (
      normalized.includes('service health') ||
      normalized.includes('queue backlog') ||
      normalized.includes('reliability concerns')
    ) {
      navigate('/admin/integrations/reliability');
      return;
    }

    if (
      normalized.includes('fhir readiness') ||
      normalized.includes('supported resources') ||
      normalized.includes('interoperability posture')
    ) {
      navigate('/admin/integrations/fhir');
      return;
    }

    if (
      normalized.includes('operational trends') ||
      normalized.includes('performance risks') ||
      normalized.includes('actions from analytics')
    ) {
      navigate('/admin/analytics');
      return;
    }

    if (
      normalized.includes('critical unresolved items') ||
      normalized.includes('no owner') ||
      normalized.includes('oldest blockers')
    ) {
      navigate('/admin/unresolved-items');
      return;
    }

    if (
      normalized.includes('critical escalations') ||
      normalized.includes('escalations have no owner') ||
      normalized.includes('aged escalations')
    ) {
      navigate('/admin/escalations');
      return;
    }

    if (
      normalized.includes('release posture') ||
      normalized.includes('watch items') ||
      normalized.includes('gaps remain open')
    ) {
      navigate('/admin/release-readiness');
      return;
    }

    if (
      normalized.includes('recent audit events') ||
      normalized.includes('traceability posture') ||
      normalized.includes('controlled workflow actions')
    ) {
      navigate('/admin/audit');
      return;
    }

    if (normalized.includes('critical requests')) {
      navigate('/admin/dispatch');
      return;
    }

    if (
      normalized.includes("today's priorities") ||
      normalized.includes('open exceptions') ||
      normalized.includes('coverage health')
    ) {
      navigate('/admin/dashboard');
      return;
    }

    if (
      normalized.includes('blocked onboarding') ||
      normalized.includes('pending verifications') ||
      normalized.includes('missing documents')
    ) {
      navigate('/admin/access');
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

          {proactiveAlerts.length > 0 ? (
            <div className="assistantActionBar">
              <div className="assistantActionBarTitle">Live alerts</div>
              <div className="assistantAlertList">
                {proactiveAlerts.map((alert) => (
                  <button
                    key={alert}
                    className="assistantAlertCard"
                    onClick={() => {
                      void runAssistantShortcut(alert);
                    }}
                    type="button"
                  >
                    {alert}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="assistantActionBar assistantActionBar-soft">
            <div className="assistantActionBarTitle">Suggested actions</div>
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
