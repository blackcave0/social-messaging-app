import supabase from '../config/supabase';
import fs from 'fs';
import path from 'path';

const checkTables = async () => {
  try {
    // console.log('Checking Supabase tables...');
    
    // Check if conversations table exists
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);
    
    if (conversationsError && conversationsError.code === '42P01') {
      console.error('Error: conversations table not found');
      showInstructions();
      return false;
    }
    
    // Check if messages table exists
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (messagesError && messagesError.code === '42P01') {
      console.error('Error: messages table not found');
      showInstructions();
      return false;
    }
    
    // Both tables exist
    // console.log('Supabase tables are properly set up');
    return true;
  } catch (error) {
    console.error('Error checking tables:', error);
    showInstructions();
    return false;
  }
};

const showInstructions = () => {
  // console.log('\n--------------------------------------------------------');
  // console.log('IMPORTANT: You need to set up your Supabase tables manually');
  // console.log('--------------------------------------------------------\n');
  
  // console.log('Follow these steps:');
  // console.log('1. Go to your Supabase project dashboard');
  // console.log('2. Navigate to the SQL Editor');
  // console.log('3. Create a new query');
  // console.log('4. Copy the SQL code from this file: src/config/supabase-schema.sql');
  // console.log('5. Run the query to create the necessary tables');
  // console.log('6. Restart your backend server\n');
  
  // console.log('If you need to view the SQL code directly, run: cat src/config/supabase-schema.sql');
};

// Run the check
checkTables().then(success => {
  if (success) {
    // console.log('Supabase tables check completed successfully');
  } else {
    // console.log('Supabase tables check failed - follow the instructions above');
  }
  process.exit(0);
}).catch(err => {
  console.error('Supabase tables check failed with error:', err);
  process.exit(1);
}); 