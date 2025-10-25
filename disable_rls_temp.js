const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function disableRLSTemporarily() {
  console.log('Temporarily disabling RLS on user_profiles...');
  
  try {
    // Disable RLS temporarily
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;' 
    });

    console.log('✅ RLS disabled on user_profiles');
    
    // Test the fix
    console.log('\n=== TESTING WITHOUT RLS ===');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError.message);
    } else {
      console.log('✅ Profile fetch successful:', profile.username, profile.role);
    }

    // Test full login flow
    console.log('\n=== TESTING FULL LOGIN FLOW ===');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@vofc.gov',
      password: 'Admin123!'
    });

    if (authError) {
      console.error('Auth failed:', authError.message);
    } else {
      console.log('✅ Auth successful:', authData.user.email);
      
      const { data: profileData, error: profileError2 } = await supabase
        .from('user_profiles')
        .select('role, first_name, last_name, organization, is_active')
        .eq('user_id', authData.user.id)
        .single();

      if (profileError2) {
        console.error('❌ Profile fetch failed:', profileError2.message);
      } else {
        console.log('✅ Full login flow successful:', profileData);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

disableRLSTemporarily().catch(console.error);
