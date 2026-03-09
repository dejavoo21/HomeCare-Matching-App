import { useEffect, useRef, useState } from 'react';
import { Activity, MessageSquare, Users } from 'lucide-react';
import { useCommunication } from '../contexts/CommunicationContext';
import { ChatDrawer } from './ChatDrawer';

export function CommunicationHub() {
  const { summary } = useCommunication();
  const [panelOpen, setPanelOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const unread = summary.unreadMessages || 0;
  const presence = summary.workforcePresence;

  useEffect(() => {
    if (!panelOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPanelOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [panelOpen]);

  return (
    <>
      <div className="commHubRoot" ref={rootRef}>
        <button
          type="button"
          className="commHubTrigger"
          onClick={() => setPanelOpen((current) => !current)}
          aria-label="Open communication hub"
          aria-expanded={panelOpen}
        >
          <MessageSquare size={18} />
          <span className="commHubTriggerText">Comms</span>
          {unread > 0 ? <span className="commHubBadge">{unread}</span> : null}
        </button>

        {panelOpen ? (
          <div className="commHubPopover" role="dialog" aria-label="Communication hub">
            <div className="commHubHeader">
              <div className="commHubTitle">Communication Hub</div>
            </div>

            <div className="commHubStats">
              <div className="commHubStat">
                <MessageSquare size={16} />
                <span>Unread</span>
                <strong>{unread}</strong>
              </div>

              <div className="commHubStat">
                <Users size={16} />
                <span>On shift</span>
                <strong>{presence.onShift}</strong>
              </div>

              <div className="commHubStat">
                <Activity size={16} />
                <span>In visit</span>
                <strong>{presence.inVisit}</strong>
              </div>
            </div>

            <div className="commHubActions">
              <button
                className="btn btn-primary btn-small"
                type="button"
                onClick={() => {
                  setPanelOpen(false);
                  setChatOpen(true);
                }}
              >
                Open Chat
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
