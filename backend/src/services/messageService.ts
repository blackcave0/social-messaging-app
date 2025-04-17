import supabase from '../config/supabase';

// Define types
interface Message {
  id?: string;
  sender_id: string;
  recipient_id: string;
  conversation_id: string;
  text: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  read: boolean;
  created_at?: string;
}

interface Conversation {
  id?: string;
  participants: string[];
  last_message_id?: string;
  created_at?: string;
}

// Helper to handle Supabase errors
const handleSupabaseError = (error: any, fallbackMsg: string): never => {
  // If it's a table doesn't exist error (42P01), throw a more helpful message
  if (error?.code === '42P01' || 
      (error?.message && 
       (error.message.includes('relation') && error.message.includes('does not exist')))) {
    throw new Error(`Supabase tables not found. Please run the SQL setup script. Run 'npm run create-tables' for instructions.`);
  }
  
  console.error('Supabase error:', error);
  throw new Error(fallbackMsg);
};

// Check if conversations table exists and warn if not
export const checkTablesExist = async (): Promise<boolean> => {
  try {
    // Try a simple query to see if conversations table exists
    const { data, error } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      // console.error(`⚠️ ERROR: Supabase tables not set up`);
      // console.error(`Run 'npm run create-tables' to get setup instructions`);
      return false;
    }
    
    return true;
  } catch (error: any) {
    if (error?.code === '42P01' || (error?.message && error.message.includes('relation') && error.message.includes('does not exist'))) {
      // console.error(`⚠️ ERROR: Supabase tables not set up`);
      // console.error(`Run 'npm run create-tables' to get setup instructions`);
      return false;
    }
    
    // Some other error occurred
    console.error('Error checking Supabase tables:', error);
    return false;
  }
};

// Get all conversations for a user
export const getConversations = async (userId: string) => {
  try {
    // console.log(`Getting conversations for user: ${userId}`);
    
    // First check if tables exist
    const tablesExist = await checkTablesExist();
    if (!tablesExist) {
      // console.log('Tables do not exist, returning empty conversations array');
      return [];
    }
    
    // console.log('Tables exist, querying conversations');
    
    // First get all the conversations where the user is a participant
    // Use contains instead of filter with cs operator
    const { data: conversations, error: convoError } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', [userId])
      .order('created_at', { ascending: false });
    
    // If that fails, try another approach
    if (convoError) {
      // console.log('First query failed, trying alternative approach');
      try {
        // Try another query approach using Postgres operator
        const { data: altConversations, error: altError } = await supabase
          .from('conversations')
          .select('*')
          .or(`participants.cs.{${userId}}`)
          .order('created_at', { ascending: false });
          
        if (altError) {
          return handleSupabaseError(altError, `Error fetching conversations: ${altError.message}`);
        }
        
        if (altConversations && altConversations.length > 0) {
          // console.log(`Found ${altConversations.length} conversations with alternative query`);
          return altConversations;
        }
        
        // If no conversations found but no error, return empty array
        return [];
      } catch (altQueryError) {
        return handleSupabaseError(convoError, `Error fetching conversations: ${convoError.message}`);
      }
    }

    // console.log(`Found ${conversations?.length || 0} conversations for user ${userId}`);

    if (!conversations || conversations.length === 0) {
      return [];
    }

    // For each conversation, get the last message if one exists
    const enrichedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        // console.log(`Processing conversation: ${conversation.id}`);
        
        if (conversation.last_message_id) {
          const { data: lastMessage, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('id', conversation.last_message_id)
            .single();

          if (msgError) {
            console.error(`Error fetching last message for conversation ${conversation.id}:`, msgError);
          }

          if (!msgError && lastMessage) {
            return {
              ...conversation,
              last_message: lastMessage
            };
          }
        }
        
        return conversation;
      })
    );

    return enrichedConversations;
  } catch (error: any) {
    console.error('Error in getConversations:', error);
    
    // Graceful fallback - return empty array
    return [];
  }
};

// Get or create a conversation between two users
export const getOrCreateConversation = async (userId1: string, userId2: string) => {
  try {
    // console.log(`Looking for conversation between users ${userId1} and ${userId2}`);
    
    // Check if tables exist first
    const tablesExist = await checkTablesExist();
    if (!tablesExist) {
      // console.log('Tables do not exist, cannot get or create conversation');
      throw new Error('Supabase tables not set up. Run the SQL setup script first.');
    }
    
    // console.log('Tables exist, searching for conversation');
    
    // Try a series of different query approaches to find the conversation
    
    // Approach 1: Using contains with array
    let existingConversations = null;
    let fetchError = null;
    
    try {
      const result = await supabase
        .from('conversations')
        .select('*')
        .contains('participants', [userId1, userId2])
        .order('created_at', { ascending: false });
        
      existingConversations = result.data;
      fetchError = result.error;
      
      // console.log('Approach 1 result:', existingConversations?.length || 0, 'conversations found');
    } catch (err) {
      // console.log('Approach 1 failed:', err);
    }
    
    // Approach 2: Try the reverse order if first approach failed
    if (fetchError || !existingConversations || existingConversations.length === 0) {
      // console.log('First query approach failed, trying approach 2...');
      
      try {
        const result = await supabase
          .from('conversations')
          .select('*')
          .contains('participants', [userId2, userId1])
          .order('created_at', { ascending: false });
          
        existingConversations = result.data;
        fetchError = result.error;
        
        // console.log('Approach 2 result:', existingConversations?.length || 0, 'conversations found');
      } catch (err) {
        // console.log('Approach 2 failed:', err);
      }
    }
    
    // Approach 3: Try with Postgres specific operator if previous approaches failed
    if (fetchError || !existingConversations || existingConversations.length === 0) {
      // console.log('First two approaches failed, trying approach 3...');
      
      try {
        const result = await supabase
          .from('conversations')
          .select('*')
          .or(`participants.cs.{${userId1},${userId2}},participants.cs.{${userId2},${userId1}}`)
          .order('created_at', { ascending: false });
          
        existingConversations = result.data;
        fetchError = result.error;
        
        // console.log('Approach 3 result:', existingConversations?.length || 0, 'conversations found');
      } catch (err) {
        // console.log('Approach 3 failed:', err);
      }
    }

    // If we have a serious error (not just no results)
    if (fetchError && fetchError.code !== 'PGRST116') {
      return handleSupabaseError(fetchError, `Error finding conversation: ${fetchError.message}`);
    }

    // console.log(`Total of ${existingConversations?.length || 0} existing conversations found`);

    // If a conversation exists, return it
    if (existingConversations && existingConversations.length > 0) {
      return existingConversations[0];
    }

    // Otherwise, create a new conversation
    // console.log(`Creating new conversation between ${userId1} and ${userId2}`);
    const newConversation: Conversation = {
      participants: [userId1, userId2],
    };

    const { data: createdConversation, error: insertError } = await supabase
      .from('conversations')
      .insert(newConversation)
      .select()
      .single();

    if (insertError) {
      return handleSupabaseError(insertError, `Error creating conversation: ${insertError.message}`);
    }

    // console.log(`Created new conversation with ID: ${createdConversation?.id}`);
    return createdConversation;
  } catch (error: any) {
    console.error('Error in getOrCreateConversation:', error);
    throw new Error(`Error in getOrCreateConversation: ${error.message}`);
  }
};

// Send a message
export const sendMessage = async (message: Message) => {
  try {
    console.log(`Sending message to conversation ${message.conversation_id}:`, 
      { 
        sender_id: message.sender_id, 
        recipient_id: message.recipient_id,
        text_length: message.text ? message.text.length : 0,
        has_media: !!message.media_url
      }
    );
    
    // Check if tables exist first
    if (!(await checkTablesExist())) {
      const error = new Error('Supabase tables not set up. Run the SQL setup script first.');
      console.error(error);
      throw error;
    }
    
    console.log('Tables verified, attempting to insert message');
    
    // Insert the message
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();

    if (messageError) {
      console.error('Error inserting message into Supabase:', messageError);
      return handleSupabaseError(messageError, `Error sending message: ${messageError.message}`);
    }

    if (!newMessage) {
      const error = new Error('Message was inserted but no data was returned from Supabase');
      console.error(error);
      throw error;
    }

    console.log(`Message sent successfully with ID: ${newMessage.id}`);

    // Update the conversation's last message ID
    const { error: conversationError } = await supabase
      .from('conversations')
      .update({ last_message_id: newMessage.id })
      .eq('id', message.conversation_id);

    if (conversationError) {
      console.error('Supabase error updating conversation:', conversationError);
      // Still return the message even if updating the conversation fails
    } else {
      console.log(`Updated conversation ${message.conversation_id} with last_message_id: ${newMessage.id}`);
    }

    return newMessage;
  } catch (error: any) {
    console.error('Error in sendMessage:', error);
    console.error('Error stack:', error.stack);
    throw new Error(`Error sending message: ${error.message}`);
  }
};

// Get messages for a conversation
export const getMessages = async (conversationId: string, page = 1, limit = 100) => {
  try {
    // console.log(`Getting messages for conversation ${conversationId} (page ${page}, limit ${limit})`);
    
    // Check if tables exist first
    if (!(await checkTablesExist())) {
      return {
        messages: [],
        totalMessages: 0,
        currentPage: page,
        totalPages: 0,
      };
    }
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Get messages - specify enough columns to avoid overflow
    const { data: messages, error: messagesError, count } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, recipient_id, text, media_url, media_type, read, created_at, updated_at', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (messagesError) {
      console.error('Supabase error fetching messages:', messagesError);
      return {
        messages: [],
        totalMessages: 0,
        currentPage: page,
        totalPages: 0,
      };
    }

    // console.log(`Found ${messages?.length || 0} messages for conversation ${conversationId}`);

    // Mark messages as read
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .eq('read', false);
    } catch (updateError) {
      console.error('Error marking messages as read:', updateError);
      // Continue even if marking as read fails
    }

    return {
      messages: messages || [],
      totalMessages: count || 0,
      currentPage: page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error: any) {
    console.error('Error in getMessages:', error);
    
    // Return empty results instead of throwing
    return {
      messages: [],
      totalMessages: 0,
      currentPage: page,
      totalPages: 0,
    };
  }
};

// Get unread message count for a user
export const getUnreadCount = async (userId: string) => {
  try {
    // console.log(`Getting unread message count for user ${userId}`);
    
    // Check if tables exist first
    if (!(await checkTablesExist())) {
      return { unreadCount: 0 };
    }
    
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Supabase error getting unread count:', error);
      return { unreadCount: 0 };
    }

    // console.log(`User ${userId} has ${count || 0} unread messages`);
    return { unreadCount: count || 0 };
  } catch (error: any) {
    console.error('Error in getUnreadCount:', error);
    return { unreadCount: 0 };
  }
};

// Mark messages as read in a conversation for a user
export const markMessagesAsRead = async (conversationId: string, userId: string) => {
  try {
    // console.log(`Marking messages as read in conversation ${conversationId} for user ${userId}`);
    
    // Check if tables exist first
    if (!(await checkTablesExist())) {
      return { markedMessageIds: [] };
    }
    
    // Find all unread messages in this conversation where the user is the recipient
    const { data: messagesToMark, error: findError } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('recipient_id', userId)
      .eq('read', false);
      
    if (findError) {
      console.error('Error finding messages to mark as read:', findError);
      return { markedMessageIds: [] };
    }
    
    if (!messagesToMark || messagesToMark.length === 0) {
      // console.log('No unread messages to mark as read');
      return { markedMessageIds: [] };
    }
    
    // Extract the message IDs
    const messageIds = messagesToMark.map(msg => msg.id);
    // console.log(`Found ${messageIds.length} messages to mark as read`);
    
    // Update the messages to mark them as read
    const { error: updateError } = await supabase
      .from('messages')
      .update({ read: true })
      .in('id', messageIds);
      
    if (updateError) {
      console.error('Error marking messages as read:', updateError);
      return { markedMessageIds: [] };
    }
    
    // console.log(`Successfully marked ${messageIds.length} messages as read`);
    return { markedMessageIds: messageIds };
  } catch (error: any) {
    console.error('Error in markMessagesAsRead:', error);
    return { markedMessageIds: [] };
  }
}; 