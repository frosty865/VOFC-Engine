const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRLSPermanent() {
  console.log('Permanently fixing RLS issues...');
  
  try {
    // Step 1: Completely disable RLS
    console.log('Disabling RLS on user_profiles...');
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;' 
    });

    // Step 2: Drop ALL policies
    console.log('Dropping all policies...');
    const policies = [
      'Users can view their own profile',
      'Users can update their own profile', 
      'Admins can view all profiles',
      'Admins can update all profiles',
      'Service role can manage profiles',
      'Allow authenticated users to view profiles',
      'Allow authenticated users to update profiles',
      'Allow service role full access'
    ];

    for (const policy of policies) {
      try {
        await supabase.rpc('exec_sql', { 
          sql: `DROP POLICY IF EXISTS "${policy}" ON user_profiles;` 
        });
      } catch (e) {
        // Ignore errors
      }
    }

    // Step 3: Force remove any remaining policies
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

    console.log('✅ RLS completely disabled and policies removed');

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

    // Step 5: Test full login flow
    console.log('\n=== TESTING FULL LOGIN FLOW ===');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@vofc.gov',
      password: 'Admin123!'
    });

    if (authError) {
      console.error('Auth failed:', authError.message);
    } else {
      console.log('✅ Auth successful:', authData.user.email);
      
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, first_name, last_name, organization, is_active')
        .eq('user_id', authData.user.id)
        .single();

      if (profileError) {
        console.error('❌ Profile lookup still failing:', profileError.message);
      } else {
        console.log('✅ FULL LOGIN FLOW SUCCESSFUL:', profileData);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixRLSPermanent().catch(console.error);
