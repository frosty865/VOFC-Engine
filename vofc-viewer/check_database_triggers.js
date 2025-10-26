const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseTriggers() {
  console.log('Checking for database triggers and functions...');
  
  try {
    // Check for triggers on user_profiles
    const { data: triggers, error: triggersError } = await supabase.rpc('exec_sql', { 
      sql: `SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers 
            WHERE event_object_table = 'user_profiles';` 
    });
    
    console.log('Triggers on user_profiles:', triggers);

    // Check for functions that might reference user_profiles
    const { data: functions, error: functionsError } = await supabase.rpc('exec_sql', { 
      sql: `SELECT proname, prosrc 
            FROM pg_proc 
            WHERE prosrc LIKE '%user_profiles%';` 
    });
    
    console.log('Functions referencing user_profiles:', functions);

    // Check for any views that might be causing issues
    const { data: views, error: viewsError } = await supabase.rpc('exec_sql', { 
      sql: `SELECT table_name, view_definition
            FROM information_schema.views 
            WHERE table_name LIKE '%user%';` 
    });
    
    console.log('Views with user in name:', views);

    // Check current RLS status
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', { 
      sql: `SELECT schemaname, tablename, rowsecurity 
            FROM pg_tables 
            WHERE tablename = 'user_profiles';` 
    });
    
    console.log('Current RLS status:', rlsStatus);

    // Check for any policies still remaining
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', { 
      sql: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
            FROM pg_policies 
            WHERE tablename = 'user_profiles';` 
    });
    
    console.log('Remaining policies:', policies);

  } catch (error) {
    console.error('Error checking database:', error.message);
  }
}

checkDatabaseTriggers().catch(console.error);
