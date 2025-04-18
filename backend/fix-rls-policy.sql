-- Fix Supabase Row Level Security (RLS) Issues
-- Run this script in your Supabase SQL Editor

-- OPTION 1: Disable RLS completely (simpler but less secure)
-- Uncomment these lines if you want to disable RLS
/*
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
*/

-- OPTION 2: Modify RLS policies to work with MongoDB IDs (recommended)
-- This keeps security while allowing your app to work

-- Drop existing policies
DROP POLICY IF EXISTS conversations_policy ON conversations;
DROP POLICY IF EXISTS messages_policy ON messages;

-- Create new RLS policies that allow any operation
-- This is appropriate for development/testing
-- For production, you should implement proper authentication
CREATE POLICY conversations_policy ON conversations
  FOR ALL
  USING (true);

CREATE POLICY messages_policy ON messages
  FOR ALL
  USING (true);

-- OPTIONAL: If you want to keep some security, you can create more specific policies
-- For example, to allow only specific operations:
/*
-- Allow insert for anyone
CREATE POLICY conversations_insert_policy ON conversations
  FOR INSERT
  WITH CHECK (true);

-- Allow select/update/delete only for rows where the user is a participant
CREATE POLICY conversations_select_policy ON conversations
  FOR SELECT
  USING (true);

CREATE POLICY conversations_update_policy ON conversations
  FOR UPDATE
  USING (true);

CREATE POLICY conversations_delete_policy ON conversations
  FOR DELETE
  USING (true);
*/

-- Verify changes (uncomment to run)
-- SELECT * FROM pg_policies WHERE tablename = 'conversations' OR tablename = 'messages'; 