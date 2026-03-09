import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRealTime } from '../../contexts/RealTimeContext';
import { api } from '../../services/api';
import SectionCard from '../ui/SectionCard';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

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
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function roleBadgeVariant(role?: string) {
  const normalized = String(role || '').toLowerCase();
  if (normalized.includes('dispatch')) return 'info';
  if (normalized.includes('supervisor')) return 'warning';
  if (normalized.includes('nurse') || normalized.includes('doctor')) return 'success';
  return 'neutral';
}

function ThreadMessage({ message }: { message: RequestThreadMessage }) {
  const isEvent = String(message.messageType || '').toLowerCase() !== 'text';

  return (
    <div className={isEvent ? 'rounded-2xl bg-amber-50 px-4 py-3' : 'rounded-2xl bg-slate-50 px-4 py-3'}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">{message.senderName}</div>
            {message.senderRole ? (
              <Badge variant={roleBadgeVariant(message.senderRole)}>{message.senderRole}</Badge>
            ) : null}
            {isEvent ? <Badge variant="warning">Event</Badge> : null}
          </div>
          <div className="mt-2 text-sm text-slate-700">{message.messageText}</div>
        </div>

        <div className="text-xs text-slate-400">{formatDateTime(message.createdAt)}</div>
      </div>
    </div>
  );
}

function QuickReplyBar({
  onSend,
  sending,
}: {
  onSend: (text: string) => Promise<void>;
  sending: boolean;
}) {
  const [value, setValue] = useState('');

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed) return;
    await onSend(trimmed);
    setValue('');
  }

  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Send a work-linked update for this request..."
        className="min-h-[100px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setValue('Please confirm clinician ETA and coverage status for this request.')
          }
        >
          Ask for ETA
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setValue('Patient or family notification recommended due to a timing change.')
          }
        >
          Suggest notification
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setValue('Escalation recommended. Please review service risk and next assignment step.')
          }
        >
          Escalate
        </Button>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void handleSend()} disabled={sending}>
          {sending ? 'Sending...' : 'Send update'}
        </Button>
      </div>
    </div>
  );
}

export default function RequestThreadPanel({
  requestId,
  compact = false,
  showComposer = true,
}: {
  requestId: string;
  compact?: boolean;
  showComposer?: boolean;
}) {
  const { on } = useRealTime();
  const { user } = useAuth();
  const [meta, setMeta] = useState<RequestThreadMeta | null>(null);
  const [messages, setMessages] = useState<RequestThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  async function loadThread() {
    setLoading(true);
    setError('');

    try {
      await api.getOrCreateRequestThread(requestId);
      const [metaResponse, messagesResponse] = (await Promise.all([
        api.getRequestThread(requestId),
        api.getRequestThreadMessages(requestId),
      ])) as any[];

      setMeta(metaResponse?.data || null);
      setMessages(Array.isArray(messagesResponse?.data?.messages) ? messagesResponse.data.messages : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load request thread');
      setMeta(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!requestId) return;
    void loadThread();
  }, [requestId]);

  useEffect(() => {
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
  }, [on, requestId]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages.length]);

  async function handleSendMessage(text: string) {
    setSending(true);
    setError('');

    try {
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
      } else {
        await loadThread();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send request thread message');
    } finally {
      setSending(false);
    }
  }

  const messageCount = useMemo(() => messages.length, [messages.length]);

  return (
    <SectionCard
      title="Request thread"
      subtitle="Work-linked communication for this request"
      actions={
        !loading ? (
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{messageCount} messages</Badge>
            <Button variant="secondary" size="sm" onClick={() => void loadThread()}>
              Refresh
            </Button>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : error ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
          <Button variant="secondary" onClick={() => void loadThread()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {meta ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-900">
                    {meta.serviceType || 'Request thread'}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {meta.addressText || 'Address unavailable'} | {formatDateTime(meta.preferredStart)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={String(meta.status || '').toLowerCase() === 'active' ? 'success' : 'neutral'}>
                    {meta.status || 'active'}
                  </Badge>
                  <Badge variant="info">{meta.urgency || 'request'}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {meta.clientName ? <Badge variant="neutral">{meta.clientName}</Badge> : null}
                {meta.professionalName ? <Badge variant="success">{meta.professionalName}</Badge> : null}
              </div>
            </div>
          ) : null}

          <div
            ref={containerRef}
            className={compact ? 'max-h-[320px] space-y-3 overflow-y-auto rounded-2xl bg-white' : 'max-h-[520px] space-y-3 overflow-y-auto rounded-2xl bg-white'}
          >
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No request messages yet.
              </div>
            ) : (
              messages.map((message) => <ThreadMessage key={message.id} message={message} />)
            )}
          </div>

          {showComposer ? <QuickReplyBar onSend={handleSendMessage} sending={sending} /> : null}
        </div>
      )}
    </SectionCard>
  );
}
