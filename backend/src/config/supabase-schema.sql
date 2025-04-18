-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participants TEXT[] NOT NULL,
  last_message_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  text TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video') OR media_type IS NULL),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index on conversation_id for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Add index on participants for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN (participants);

-- Add index on unread messages for a recipient
CREATE INDEX IF NOT EXISTS idx_unread_messages ON messages(recipient_id) WHERE read = FALSE;

-- Enable Row-Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy for conversations: users can only see conversations they are part of
CREATE POLICY conversations_policy ON conversations
  FOR ALL
  USING (participants @> array[auth.uid()::text]);

-- Create policy for messages: users can only see messages from conversations they are part of
CREATE POLICY messages_policy ON messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
      AND participants @> array[auth.uid()::text]
    )
  );

-- Set up Supabase Realtime for the messages table
-- Enable publication for messages table
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE messages; 