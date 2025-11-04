const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDirectQuery() {
  console.log('Testing direct database query...');
  
  try {
    // Test 1: Direct SQL query
    console.log('\n=== DIRECT SQL QUERY ===');
    const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', { 
      sql: `SELECT username, role, user_id, first_name, last_name, organization, is_active 
            FROM user_profiles 
            WHERE username = 'admin';` 
    });
    
    if (sqlError) {
      console.error('❌ SQL query failed:', sqlError.message);
    } else {
      console.log('✅ SQL query successful:', sqlResult);
    }

    // Test 2: Try with different client configuration
    console.log('\n=== DIFFERENT CLIENT TEST ===');
    const supabase2 = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: profileData, error: profileError } = await supabase2
      .from('user_profiles')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (profileError) {
      console.error('❌ Different client failed:', profileError.message);
    } else {
      console.log('✅ Different client successful:', profileData);
    }

    // Test 3: Try with anon key
    console.log('\n=== ANON KEY TEST ===');
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: anonData, error: anonError } = await supabaseAnon
      .from('user_profiles')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (anonError) {
      console.error('❌ Anon key failed:', anonError.message);
    } else {
      console.log('✅ Anon key successful:', anonData);
    }

  } catch (error) {
    console.error('Exception:', error.message);
  }
}

testDirectQuery().catch(console.error);
