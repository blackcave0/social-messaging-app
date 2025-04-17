import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase credentials
// These should be provided by your environment configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://sjccyyxekbnfhshbnovz.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY2N5eXhla2JuZmhzaGJub3Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyMzM0MzksImV4cCI6MjA1OTgwOTQzOX0.w_jTcsiyQ1HYCdQSHSTSNL3EbYze2S4jfkmUkJFxURo';

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase; 