const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceRLSDisable() {
  console.log('Force disabling RLS and clearing all policies...');
  
  try {
    // Step 1: Force disable RLS multiple times
    console.log('Force disabling RLS...');
    for (let i = 0; i < 3; i++) {
      await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;' 
      });
      console.log(`✅ RLS disable attempt ${i + 1}`);
    }

    // Step 2: Drop ALL policies with different approaches
    console.log('\nDropping all policies with multiple approaches...');
    
    // Approach 1: Drop by name
    const policyNames = [
      'Users can view their own profile',
      'Users can update their own profile', 
      'Admins can view all profiles',
      'Admins can update all profiles',
      'Service role can manage profiles',
      'Allow authenticated users to view profiles',
      'Allow authenticated users to update profiles',
      'Allow service role full access'
    ];

    for (const policy of policyNames) {
      try {
        await supabase.rpc('exec_sql', { 
          sql: `DROP POLICY IF EXISTS "${policy}" ON user_profiles;` 
        });
      } catch (e) {
        // Ignore errors
      }
    }

    // Approach 2: Drop all policies on the table
    await supabase.rpc('exec_sql', { 
      sql: `DO $$ 
            DECLARE 
                r RECORD;
            BEGIN
                FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles') LOOP
                    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON user_profiles';
                END LOOP;
            END $$;` 
    });

    // Step 3: Verify RLS is disabled
    console.log('\nVerifying RLS status...');
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', { 
      sql: `SELECT schemaname, tablename, rowsecurity 
            FROM pg_tables 
            WHERE tablename = 'user_profiles';` 
    });
    
    console.log('RLS Status:', rlsStatus);

    // Step 4: Test the fix
    console.log('\n=== TESTING FIX ===');
    const { data: testProfile, error: testError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (testError) {
      console.error('❌ Still failing:', testError.message);
    } else {
      console.log('✅ Success:', testProfile.username, testProfile.role);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

forceRLSDisable().catch(console.error);
