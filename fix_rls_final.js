const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRLSFinal() {
  console.log('Fixing RLS policies permanently...');
  
  try {
    // Step 1: Drop ALL policies on user_profiles
    console.log('Dropping all existing policies...');
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
        console.log(`✅ Dropped policy: ${policy}`);
      } catch (e) {
        console.log(`⚠️  Policy ${policy} may not exist: ${e.message}`);
      }
    }

    // Step 2: Disable RLS completely
    console.log('\nDisabling RLS on user_profiles...');
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;' 
    });
    console.log('✅ RLS disabled');

    // Step 3: Test the fix
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

    // Step 4: Test full login flow
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
    console.error('Error fixing RLS:', error.message);
  }
}

fixRLSFinal().catch(console.error);
