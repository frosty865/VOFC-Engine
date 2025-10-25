const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseFunctions() {
  console.log('Checking database functions and triggers...');
  
  try {
    // Check for any functions that might reference user_profiles
    const { data: functions, error: functionsError } = await supabase.rpc('exec_sql', { 
      sql: `SELECT proname, prosrc 
            FROM pg_proc 
            WHERE prosrc LIKE '%user_profiles%';` 
    });
    
    console.log('Functions referencing user_profiles:', functions);

    // Check for triggers
    const { data: triggers, error: triggersError } = await supabase.rpc('exec_sql', { 
      sql: `SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers 
            WHERE event_object_table = 'user_profiles';` 
    });
    
    console.log('Triggers on user_profiles:', triggers);

    // Check for any views that might be causing issues
    const { data: views, error: viewsError } = await supabase.rpc('exec_sql', { 
      sql: `SELECT table_name, view_definition
            FROM information_schema.views 
            WHERE table_name LIKE '%user%';` 
    });
    
    console.log('Views with user in name:', views);

    // Try a direct query bypassing any potential issues
    console.log('\n=== DIRECT QUERY TEST ===');
    const { data: directResult, error: directError } = await supabase
      .from('user_profiles')
      .select('username, role, user_id')
      .limit(1);

    if (directError) {
      console.error('❌ Direct query failed:', directError.message);
    } else {
      console.log('✅ Direct query successful:', directResult);
    }

  } catch (error) {
    console.error('Error checking database:', error.message);
  }
}

checkDatabaseFunctions().catch(console.error);
