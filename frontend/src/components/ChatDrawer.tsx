import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealTime } from '../contexts/RealTimeContext';
import { api } from '../services/api';

type ConversationItem = {
  id: string;
  conversationType: string;
  otherUser: {
    id: string;
    name: string;
    email?: string;
    role?: string;
    presenceStatus?: string;
  };
  lastMessage: {
    id: string;
    text: string;
    createdAt: string;
    senderUserId: string;
  } | null;
  unreadCount: number;
};

type MessageItem = {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderName: string;
  senderRole?: string;
  messageText: string;
  messageType: string;
  createdAt: string;
};

function formatMessageTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ChatDrawer({
  open,
  initialRecipientUserId,
  onClose,
}: {
  open: boolean;
  initialRecipientUserId?: string | null;
  onClose: () => void;
}) {
  const { on } = useRealTime();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || null,
    [activeConversationId, conversations]
  );

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const response = (await api.getChatConversations()) as any;
      const rows = Array.isArray(response?.data) ? response.data : [];
      setConversations(rows);

      if (!activeConversationId && rows.length > 0) {
        setActiveConversationId(rows[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const response = (await api.getConversationMessages(conversationId)) as any;
      setMessages(Array.isArray(response?.data) ? response.data : []);
      await api.markConversationRead(conversationId);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )
      );
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const openDirectConversation = async (recipientUserId: string) => {
    try {
      const response = (await api.getDirectConversation(recipientUserId)) as any;
      const conversationId = response?.data?.conversationId;
      await loadConversations();
      if (conversationId) {
        setActiveConversationId(conversationId);
      }
    } catch (err) {
      console.error('Failed to open direct conversation:', err);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadConversations();
  }, [open]);

  useEffect(() => {
    if (!open || !initialRecipientUserId) return;
    void openDirectConversation(initialRecipientUserId);
  }, [initialRecipientUserId, open]);

  useEffect(() => {
    if (!open || !activeConversationId) return;
    void loadMessages(activeConversationId);
  }, [activeConversationId, open]);

  useEffect(() => {
    if (!open) return;

    const unsubscribeMessage = on('CHAT_MESSAGE_CREATED', (event) => {
      const payload = event?.data || {};
      const conversationId = payload.conversationId;
      const message = payload.message;

      if (!conversationId || !message) return;

      setConversations((current) => {
        const next = current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                lastMessage: {
                  id: message.id,
                  text: message.messageText,
                  createdAt: message.createdAt,
                  senderUserId: message.senderUserId,
                },
                unreadCount:
                  conversationId === activeConversationId || message.senderUserId === user?.id
                    ? 0
                    : (conversation.unreadCount || 0) + 1,
              }
            : conversation
        );

        return [...next].sort((a, b) =>
          String(b.lastMessage?.createdAt || '').localeCompare(String(a.lastMessage?.createdAt || ''))
        );
      });

      if (conversationId === activeConversationId) {
        setMessages((current) => {
          const exists = current.some((item) => item.id === message.id);
          if (exists) return current;
          return [
            ...current,
            {
              id: message.id,
              conversationId,
              senderUserId: message.senderUserId,
              senderName: message.senderName || '',
              senderRole: message.senderRole || '',
              messageText: message.messageText,
              messageType: message.messageType || 'text',
              createdAt: message.createdAt,
            },
          ];
        });

        void api.markConversationRead(conversationId).catch(console.error);
      }
    });

    const unsubscribeRead = on('CHAT_READ_UPDATED', () => {});

    return () => {
      unsubscribeMessage();
      unsubscribeRead();
    };
  }, [activeConversationId, on, open, user?.id]);

  const sendMessage = async () => {
    if (!activeConversationId || !messageText.trim()) return;

    try {
      setSending(true);
      const text = messageText.trim();
      setMessageText('');

      const response = (await api.sendConversationMessage(activeConversationId, text)) as any;
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

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === activeConversationId
              ? {
                  ...conversation,
                  unreadCount: 0,
                  lastMessage: {
                    id: message.id,
                    text: message.messageText,
                    createdAt: message.createdAt,
                    senderUserId: message.senderUserId,
                  },
                }
              : conversation
          )
        );
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="clinicianDrawerOverlay" onClick={onClose}>
      <div
        className="chatDrawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chatDrawerTitle"
      >
        <div className="chatDrawerSidebar">
          <div className="chatDrawerHead">
            <h2 id="chatDrawerTitle" className="chatDrawerTitle">
              Workforce Chat
            </h2>
            <button className="btn btn-small" type="button" onClick={onClose}>
              Close
            </button>
          </div>

          {loadingConversations ? (
            <div className="empty">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="premiumEmptyState">
              <div className="premiumEmptyTitle">No conversations yet</div>
              <div className="premiumEmptyText">
                Start a conversation from the workforce directory.
              </div>
            </div>
          ) : (
            <div className="conversationList">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={
                    conversation.id === activeConversationId
                      ? 'conversationListItem conversationListItem-active'
                      : 'conversationListItem'
                  }
                  type="button"
                  onClick={() => setActiveConversationId(conversation.id)}
                >
                  <div className="conversationListTop">
                    <div className="conversationListName">{conversation.otherUser.name}</div>
                    {conversation.unreadCount > 0 ? (
                      <span className="conversationUnreadBadge">{conversation.unreadCount}</span>
                    ) : null}
                  </div>

                  <div className="conversationListMeta">
                    {String(conversation.otherUser.role || '').toUpperCase()} |{' '}
                    {String(conversation.otherUser.presenceStatus || 'offline').replace(/_/g, ' ')}
                  </div>

                  <div className="conversationListPreview">
                    {conversation.lastMessage?.text || 'No messages yet'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="chatDrawerMain">
          {!activeConversation ? (
            <div className="empty">Select a conversation.</div>
          ) : (
            <>
              <div className="chatThreadHead">
                <div>
                  <div className="chatThreadTitle">{activeConversation.otherUser.name}</div>
                  <div className="chatThreadMeta">
                    {String(activeConversation.otherUser.role || '').toUpperCase()} |{' '}
                    {String(activeConversation.otherUser.presenceStatus || 'offline').replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              <div className="chatThreadMessages">
                {loadingMessages ? (
                  <div className="empty">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="empty">No messages yet.</div>
                ) : (
                  messages.map((message) => {
                    const isMine = message.senderUserId === user?.id;

                    return (
                      <div
                        key={message.id}
                        className={isMine ? 'chatBubble chatBubble-mine' : 'chatBubble'}
                      >
                        {!isMine ? (
                          <div className="chatBubbleSender">{message.senderName}</div>
                        ) : null}
                        <div className="chatBubbleText">{message.messageText}</div>
                        <div className="chatBubbleMeta">
                          {formatMessageTime(message.createdAt)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="chatComposer">
                <input
                  className="input"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={sending || !messageText.trim()}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
