import dotenv from 'dotenv';
import mongoose from 'mongoose';
import supabase from '../config/supabase';
import Message from '../models/Message';
import Conversation from '../models/Conversation';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    // console.log('MongoDB connected');
  } catch (err: any) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// Migrate conversations and messages to Supabase
const migrateData = async () => {
  try {
    // console.log('Starting migration to Supabase...');
    
    // Get all conversations from MongoDB
    const conversations = await Conversation.find()
      .populate('participants', '_id username name profilePicture')
      .populate('lastMessage');
    
    // console.log(`Found ${conversations.length} conversations to migrate`);
    
    // For each conversation
    for (const conversation of conversations) {
      // Format participants as array of string IDs
      const participants = conversation.participants.map((p: any) => p._id.toString());
      
      // Insert conversation into Supabase
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          participants,
          created_at: conversation.createdAt.toISOString(),
          updated_at: conversation.updatedAt.toISOString()
        })
        .select()
        .single();
      
      if (conversationError) {
        console.error(`Error inserting conversation: ${conversationError.message}`);
        continue;
      }
      
      // console.log(`Migrated conversation: ${newConversation.id}`);
      
      // Get all messages for this conversation
      const messages = await Message.find({ conversation: conversation._id })
        .sort({ createdAt: 1 });
      
      // console.log(`Found ${messages.length} messages for conversation ${newConversation.id}`);
      
      // If there are messages
      if (messages.length > 0) {
        // Format messages for Supabase
        const supabaseMessages = messages.map((msg: any) => ({
          conversation_id: newConversation.id,
          sender_id: msg.sender.toString(),
          recipient_id: msg.recipient.toString(),
          text: msg.text,
          media_url: msg.mediaUrl,
          media_type: msg.mediaType,
          read: msg.read,
          created_at: msg.createdAt.toISOString(),
          updated_at: msg.updatedAt.toISOString()
        }));
        
        // Insert messages in batches to avoid hitting limits
        const batchSize = 100;
        for (let i = 0; i < supabaseMessages.length; i += batchSize) {
          const batch = supabaseMessages.slice(i, i + batchSize);
          
          const { error: messagesError } = await supabase
            .from('messages')
            .insert(batch);
          
          if (messagesError) {
            console.error(`Error inserting messages batch: ${messagesError.message}`);
          } else {
            // console.log(`Inserted ${batch.length} messages for conversation ${newConversation.id}`);
          }
        }
        
        // Update last_message_id in the conversation
        const lastMessage = messages[messages.length - 1];
        
        // Get the ID of the last inserted message from Supabase
        const { data: lastInsertedMessage, error: lastMessageError } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', newConversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (lastMessageError) {
          console.error(`Error getting last message: ${lastMessageError.message}`);
        } else if (lastInsertedMessage) {
          // Update the conversation with the last message ID
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ last_message_id: lastInsertedMessage.id })
            .eq('id', newConversation.id);
          
          if (updateError) {
            console.error(`Error updating conversation with last message: ${updateError.message}`);
          } else {
            // console.log(`Updated conversation ${newConversation.id} with last message ID`);
          }
        }
      }
    }
    
    // console.log('Migration completed successfully');
  } catch (error: any) {
    console.error('Migration error:', error.message);
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    await migrateData();
    process.exit(0);
  } catch (error: any) {
    console.error('Migration script error:', error.message);
    process.exit(1);
  }
};

// Run script
main(); 