# MongoDB to Supabase Migration Guide

This guide outlines the steps required to migrate the messaging functionality from MongoDB to Supabase.

## Backend Changes

### 1. Install Required Packages

```bash
cd backend
npm install @supabase/supabase-js
```

### 2. Set Up Supabase Client

Create a Supabase client configuration at `backend/src/config/supabase.ts`.

### 3. Database Schema Setup

Use the SQL script provided at `backend/src/config/supabase-schema.sql` to set up your Supabase database schema. This will create:
- A `conversations` table
- A `messages` table
- Appropriate indexes and security policies
- Realtime subscriptions for messages

### 4. Update Environment Variables

Add Supabase credentials to your `.env` file:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Message Service

We've created a new service for handling messages at `backend/src/services/messageService.ts` that:
- Abstracts database operations
- Provides a consistent API for your controllers
- Ensures compatibility with the existing codebase

### 6. Controller Updates

The `chatController.ts` has been updated to:
- Use the new message service
- Handle both MongoDB and Supabase data formats
- Maintain compatibility with the frontend

### 7. Server Integration with Supabase Realtime

The server now:
- Connects to Supabase Realtime for real-time messaging
- Forwards messages from Supabase to connected Socket.IO clients
- Maintains compatibility with the existing Socket.IO setup

### 8. Data Migration

Use the utility script at `backend/src/utils/migrateToSupabase.ts` to migrate existing data from MongoDB to Supabase:

```bash
npm run migrate-to-supabase
```

## Frontend Changes

### 1. Install Required Packages

```bash
cd frontend
npm install @supabase/supabase-js
```

### 2. Update ChatContext

The `ChatContext.tsx` has been updated to:
- Support both MongoDB and Supabase data formats
- Normalize data between different formats
- Maintain the same API for the rest of the application

### 3. Set Up Supabase Client

Create a Supabase client configuration at `frontend/src/utils/supabase.ts`.

## Testing the Migration

1. Set up Supabase using the instructions in `backend/SUPABASE_SETUP.md`
2. Run the migration script to move existing data
3. Start the backend and frontend applications
4. Test sending and receiving messages

## Rollback Plan

If issues arise, you can revert to MongoDB by:
- Removing the Supabase integration from controllers
- Reverting the server.ts changes
- Continuing to use the existing MongoDB models

## Additional Notes

- This migration maintains backward compatibility with existing code
- The changes are designed to minimize disruption to the user experience
- MongoDB and Supabase can run in parallel during the transition if needed 