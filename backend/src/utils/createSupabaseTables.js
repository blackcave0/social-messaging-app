// Simple script to create Supabase tables via REST API
// Make sure to run: npm install node-fetch@2 first
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function createTables() {
  // console.log('Preparing SQL for Supabase tables...');
  
  // Get the Supabase URL and key from env
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be defined in .env file');
    process.exit(1);
  }
  
  // Read the complete SQL script
  const sqlPath = path.join(__dirname, '..', '..', 'supabase-complete-script.sql');
  const sqlScript = fs.readFileSync(sqlPath, 'utf8');
  
  // Execute SQL via REST API
  try {
    // Create REST service URL
    const restServiceUrl = `${supabaseUrl}/rest/v1/`;
    
    // console.log("Using Supabase URL:", supabaseUrl);
    
    // Make a basic query to verify connectivity
    const response = await fetch(`${restServiceUrl}`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    // console.log("Connection test response:", response.status === 200 ? '✅ Success' : '❌ Failed');
    
    if (!response.ok) {
      throw new Error(`Supabase connection test failed with status: ${response.status}`);
    }
    
    // console.log('\n===========================================================');
    // console.log('⚠️  IMPORTANT: SUPABASE TABLES SETUP INSTRUCTIONS  ⚠️');
    // console.log('===========================================================\n');
    // console.log('To create the required tables in Supabase, follow these steps:');
    // console.log('1. Log in to your Supabase dashboard at https://app.supabase.com/');
    // console.log('2. Select your project');
    // console.log('3. Navigate to SQL Editor (from the left sidebar)');
    // console.log('4. Click the "+ New Query" button');
    // console.log('5. Copy and paste the ENTIRE SQL code below:');
    // console.log('\n----- COPY EVERYTHING BETWEEN THESE LINES -----\n');
    // console.log(sqlScript);
    // console.log('\n----- COPY EVERYTHING BETWEEN THESE LINES -----\n');
    // console.log('6. Click the "Run" button to execute the SQL');
    // console.log('7. After creating the tables, enable realtime for the messages table:');
    // console.log('   - Go to Database > Realtime in the left sidebar');
    // console.log('   - Make sure the "messages" table is enabled');
    // console.log('8. Restart your backend server\n');
    
    // console.log('===========================================================');
    // console.log('⚠️  AFTER EXECUTING THE SQL, RESTART YOUR SERVER  ⚠️');
    // console.log('===========================================================\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createTables(); 