import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealTime } from '../contexts/RealTimeContext';
import { api } from '../services/api';

type RequestThreadMeta = {
  conversationId: string;
  requestId: string;
  serviceType?: string;
  status?: string;
  urgency?: string;
  addressText?: string;
  preferredStart?: string;
  clientName?: string;
  professionalName?: string;
};

type RequestThreadMessage = {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderName: string;
  senderRole?: string;
  messageText: string;
  messageType: string;
  createdAt: string;
};

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function formatTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function RequestChatDrawer({
  open,
  requestId,
  onClose,
}: {
  open: boolean;
  requestId: string | null;
  onClose: () => void;
}) {
  const { on } = useRealTime();
  const { user } = useAuth();
  const [meta, setMeta] = useState<RequestThreadMeta | null>(null);
  const [messages, setMessages] = useState<RequestThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');

  const load = async () => {
    if (!requestId) return;

    try {
      setLoading(true);
      await api.getOrCreateRequestThread(requestId);
      const [metaResponse, messagesResponse] = (await Promise.all([
        api.getRequestThread(requestId),
        api.getRequestThreadMessages(requestId),
      ])) as any[];

      setMeta(metaResponse?.data || null);
      setMessages(Array.isArray(messagesResponse?.data?.messages) ? messagesResponse.data.messages : []);
    } catch (err) {
      console.error('Failed to load request thread:', err);
      setMeta(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !requestId) return;
    void load();
  }, [open, requestId]);

  useEffect(() => {
    if (!open || !requestId) return;

    const unsubscribe = on('CHAT_MESSAGE_CREATED', (event) => {
      const payload = event?.data || {};
      if (String(event?.requestId || '') !== String(requestId)) return;
      const message = payload.message;
      if (!message) return;

      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) {
          return current;
        }

        return [
          ...current,
          {
            id: message.id,
            conversationId: message.conversationId,
            senderUserId: message.senderUserId,
            senderName: message.senderName || '',
            senderRole: message.senderRole || '',
            messageText: message.messageText,
            messageType: message.messageType || 'text',
            createdAt: message.createdAt,
          },
        ];
      });
    });

    return () => unsubscribe();
  }, [on, open, requestId]);

  const send = async () => {
    if (!requestId || !messageText.trim()) return;

    try {
      setSending(true);
      const text = messageText.trim();
      setMessageText('');
      const response = (await api.sendRequestThreadMessage(requestId, text)) as any;
      const message = response?.data;

      if (message) {
        setMessages((current) => [
          ...current,
          {
            id: message.id,
            conversationId: message.conversationId,
            senderUserId: message.senderUserId,
            senderName: message.senderName || user?.name || 'You',
            senderRole: message.senderRole || '',
            messageText: message.messageText,
            messageType: message.messageType,
            createdAt: message.createdAt,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to send request thread message:', err);
    } finally {
      setSending(false);
    }
  };

  if (!open || !requestId) return null;

  return (
    <div className="clinicianDrawerOverlay" onClick={onClose}>
      <div
        className="requestChatDrawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="requestThreadTitle"
      >
        <div className="chatThreadHead">
          <div>
            <h2 id="requestThreadTitle" className="chatThreadTitle">
              Request Thread
            </h2>
            {meta ? (
              <div className="chatThreadMeta">
                {meta.serviceType || 'Care request'} • {meta.clientName || 'Client'} •{' '}
                {formatDateTime(meta.preferredStart)}
              </div>
            ) : null}
          </div>

          <button className="btn btn-small" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {loading ? (
          <div className="empty requestChatBody">Loading request conversation...</div>
        ) : (
          <>
            {meta ? (
              <div className="requestThreadSummary">
                <div className="requestThreadSummaryItem">
                  <span className="requestThreadSummaryLabel">Status</span>
                  <strong>{meta.status || '—'}</strong>
                </div>

                <div className="requestThreadSummaryItem">
                  <span className="requestThreadSummaryLabel">Urgency</span>
                  <strong>{meta.urgency || '—'}</strong>
                </div>

                <div className="requestThreadSummaryItem requestThreadSummaryItem-wide">
                  <span className="requestThreadSummaryLabel">Address</span>
                  <strong>{meta.addressText || '—'}</strong>
                </div>
              </div>
            ) : null}

            <div className="chatThreadMessages">
              {messages.length === 0 ? (
                <div className="empty">No request messages yet.</div>
              ) : (
                messages.map((message) => {
                  const isMine = message.senderUserId === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={isMine ? 'chatBubble chatBubble-mine' : 'chatBubble'}
                    >
                      {!isMine ? (
                        <div className="chatBubbleSender">
                          {message.senderName}
                          {message.senderRole
                            ? ` • ${String(message.senderRole).toUpperCase()}`
                            : ''}
                        </div>
                      ) : null}

                      <div className="chatBubbleText">{message.messageText}</div>
                      <div className="chatBubbleMeta">{formatTime(message.createdAt)}</div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="chatComposer">
              <input
                className="input"
                placeholder="Type a request update..."
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void send()}
                disabled={sending || !messageText.trim()}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
