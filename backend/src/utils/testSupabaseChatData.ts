import supabase from '../config/supabase';

const testChatFunctionality = async () => {
  // console.log('Testing Supabase chat functionality...');
  
  try {
    // Create test users (in a real app, these would be real user IDs)
    const testUser1 = '67f456973256853fe7b21458'; // Use an actual user ID from your system
    const testUser2 = '67f07c0e1c405875c8dbe373'; // Use another actual user ID
    
    // console.log(`Creating test conversation between users ${testUser1} and ${testUser2}`);
    
    // Create a conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        participants: [testUser1, testUser2]
      })
      .select()
      .single();
    
    if (conversationError) {
      console.error('Error creating conversation:', conversationError);
      return;
    }
    
    // console.log('Created conversation:', conversation);
    
    // Send a test message
    const message1 = {
      sender_id: testUser1,
      recipient_id: testUser2,
      conversation_id: conversation.id,
      text: 'Hello from Supabase!',
      read: false
    };
    
    const { data: sentMessage, error: messageError } = await supabase
      .from('messages')
      .insert(message1)
      .select()
      .single();
    
    if (messageError) {
      console.error('Error sending message:', messageError);
      return;
    }
    
    // console.log('Sent message:', sentMessage);
    
    // Update the conversation with the last message ID
    await supabase
      .from('conversations')
      .update({ last_message_id: sentMessage.id })
      .eq('id', conversation.id);
    
    // Send a reply
    const message2 = {
      sender_id: testUser2,
      recipient_id: testUser1,
      conversation_id: conversation.id,
      text: 'Reply from Supabase!',
      read: false
    };
    
    const { data: replyMessage, error: replyError } = await supabase
      .from('messages')
      .insert(message2)
      .select()
      .single();
    
    if (replyError) {
      console.error('Error sending reply:', replyError);
      return;
    }
    
    // console.log('Sent reply:', replyMessage);
    
    // Update conversation with new last message
    await supabase
      .from('conversations')
      .update({ last_message_id: replyMessage.id })
      .eq('id', conversation.id);
    
    // Verify the conversation can be retrieved
    const { data: conversationsByUser1, error: fetchError1 } = await supabase
      .from('conversations')
      .select('*, messages(*)')
      .contains('participants', [testUser1])
      .order('created_at', { ascending: false });
    
    if (fetchError1) {
      console.error('Error fetching conversations for user 1:', fetchError1);
    } else {
      // console.log(`Found ${conversationsByUser1.length} conversations for user 1:`, conversationsByUser1);
    }
    
    // Verify the conversation can be retrieved for user 2
    const { data: conversationsByUser2, error: fetchError2 } = await supabase
      .from('conversations')
      .select('*, messages(*)')
      .contains('participants', [testUser2])
      .order('created_at', { ascending: false });
    
    if (fetchError2) {
      console.error('Error fetching conversations for user 2:', fetchError2);
    } else {
      // console.log(`Found ${conversationsByUser2.length} conversations for user 2:`, conversationsByUser2);
    }
    
    // console.log('Test complete!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
};

// Run the test
testChatFunctionality().then(() => {
  // console.log('Test script completed');
  process.exit(0);
}).catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
}); 