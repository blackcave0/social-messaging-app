-- Reset Supabase tables and recreate them from scratch
-- THIS WILL DELETE ALL YOUR DATA - Use with caution
-- Run this script in your Supabase SQL Editor

-- 1. Drop existing tables and functions
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP FUNCTION IF EXISTS update_conversation_timestamp CASCADE;
DROP FUNCTION IF EXISTS get_unread_count CASCADE;
DROP PUBLICATION IF EXISTS supabase_realtime;

-- 2. Create conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participants TEXT[] NOT NULL,
  last_message_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  text TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video') OR media_type IS NULL),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_conversations_participants ON conversations USING GIN (participants);
CREATE INDEX idx_unread_messages ON messages(recipient_id) WHERE read = FALSE;
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- 5. Setup realtime functionality for messages
CREATE PUBLICATION supabase_realtime FOR TABLE messages;

-- 6. Add trigger to update conversations.updated_at when a new message is added
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW(),
      last_message_id = NEW.id
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- 7. Add function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_count(user_id TEXT)
RETURNS TABLE (conversation_id UUID, unread_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT m.conversation_id, COUNT(*) as unread_count
  FROM messages m
  WHERE m.recipient_id = user_id
  AND m.read = FALSE
  GROUP BY m.conversation_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Enable Row Level Security but with permissive policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 9. Create permissive policies (allow all operations)
CREATE POLICY conversations_policy ON conversations
  FOR ALL
  USING (true);

CREATE POLICY messages_policy ON messages
  FOR ALL
  USING (true);

-- 10. Verify the table structure
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('messages', 'conversations')
ORDER BY table_name, ordinal_position; 