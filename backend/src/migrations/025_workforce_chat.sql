CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_type text NOT NULL DEFAULT 'direct',
  request_id uuid NULL REFERENCES care_requests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_type
  ON conversations(conversation_type);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
  ON conversation_participants(user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_text text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages(conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS conversation_reads (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_message_id uuid NULL REFERENCES chat_messages(id) ON DELETE SET NULL,
  last_read_at timestamptz,
  PRIMARY KEY (conversation_id, user_id)
);
