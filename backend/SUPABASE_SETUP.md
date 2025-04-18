# Supabase Setup for Social Messaging App

This document provides instructions for setting up Supabase for the messaging feature of the application.

## 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up or log in
2. Create a new project
3. Choose a name and set a secure database password
4. Wait for the project to be created (this may take a few minutes)

## 2. Set Up Database Schema

You can run the provided SQL script to set up the required tables and security policies:

1. In your Supabase project dashboard, go to the "SQL Editor" section
2. Create a new query
3. Copy and paste the contents of `src/config/supabase-schema.sql` into the editor
4. Run the query

This will create:
- A `conversations` table to store chat conversations
- A `messages` table to store individual messages
- Appropriate indexes for performance
- Row-level security policies for data protection
- Realtime subscription setup for the messages table

## 3. Enable Realtime

For real-time functionality, you need to enable Realtime for your tables:

1. In your Supabase dashboard, go to "Database" > "Realtime"
2. Make sure the "messages" table is enabled for realtime
3. Click "Save"

## 4. Set Up Environment Variables

Add your Supabase project URL and anon key to your `.env` file:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your Supabase project dashboard under "Settings" > "API".

## 5. Migrate Existing Data (Optional)

If you have existing conversations and messages in MongoDB, you can migrate them to Supabase:

```
npm run migrate-to-supabase
```

This script will:
1. Fetch all conversations and messages from MongoDB
2. Insert them into the appropriate Supabase tables
3. Preserve the relationships between conversations and messages

## 6. Testing Supabase Integration

After setting up Supabase, you can test the integration:

1. Start the backend server: `npm run dev`
2. Use the API to send a message
3. Verify that the message appears in the Supabase database
4. Test real-time functionality by observing message delivery across clients

## How to Fix Row Level Security (RLS) Policy Error

If you're getting an error like:
```
new row violates row-level security policy for table "conversations"
```

This is because Supabase's Row Level Security is expecting Supabase auth IDs, but your application is using MongoDB IDs.

### Option 1: Disable RLS for your Tables

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query with the following content:

```sql
-- Disable RLS for development/testing
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
```

4. Click "Run" to execute the SQL

### Option 2: Update RLS Policies to Allow Any Operation

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query with the following content:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS conversations_policy ON conversations;
DROP POLICY IF EXISTS messages_policy ON messages;

-- Create new policies that allow any operation
CREATE POLICY conversations_policy ON conversations
  FOR ALL
  USING (true);

CREATE POLICY messages_policy ON messages
  FOR ALL
  USING (true);
```

4. Click "Run" to execute the SQL

After applying either option, restart your backend server.

## Troubleshooting

If you encounter issues:

1. Check your Supabase credentials in the `.env` file
2. Verify that Realtime is enabled for the messages table
3. Check server logs for any error messages
4. Verify that you have the necessary permissions set up in Supabase
5. Check the Row Level Security policies to ensure they're not blocking your requests 