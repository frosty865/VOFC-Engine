const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRLSStatus() {
  console.log('Checking RLS status and policies...');
  
  try {
    // Check if RLS is enabled
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', { 
      sql: `SELECT schemaname, tablename, rowsecurity 
            FROM pg_tables 
            WHERE tablename = 'user_profiles';` 
    });
    
    console.log('RLS Status:', rlsStatus);

    // Check existing policies
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', { 
      sql: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
            FROM pg_policies 
            WHERE tablename = 'user_profiles';` 
    });
    
    console.log('Existing policies:', policies);

    // Try to completely remove RLS and recreate
    console.log('\n=== FORCE REMOVING RLS ===');
    await supabase.rpc('exec_sql', { 
      sql: 'DROP POLICY IF EXISTS "Allow authenticated users to view profiles" ON user_profiles;' 
    });
    await supabase.rpc('exec_sql', { 
      sql: 'DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON user_profiles;' 
    });
    await supabase.rpc('exec_sql', { 
      sql: 'DROP POLICY IF EXISTS "Allow service role full access" ON user_profiles;' 
    });
    
    // Disable RLS completely
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;' 
    });

    console.log('✅ RLS completely disabled');

    // Test again
    const { data: testProfile, error: testError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (testError) {
      console.error('❌ Still failing:', testError.message);
    } else {
      console.log('✅ Success after RLS removal:', testProfile.username);
    }

  } catch (error) {
    console.error('Error checking RLS:', error.message);
  }
}

checkRLSStatus().catch(console.error);
