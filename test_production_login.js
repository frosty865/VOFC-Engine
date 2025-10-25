const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testProductionLogin() {
  console.log('Testing production login...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Test 1: Direct Supabase auth
  console.log('\n=== TEST 1: Direct Supabase Auth ===');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@vofc.gov',
      password: 'Admin123!'
    });

    if (error) {
      console.error('Direct auth failed:', error.message);
    } else {
      console.log('✅ Direct auth successful:', data.user.email, data.user.id);
    }
  } catch (err) {
    console.error('Direct auth exception:', err.message);
  }

  // Test 2: Check user profile
  console.log('\n=== TEST 2: User Profile Check ===');
  try {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError.message);
    } else {
      console.log('✅ Profile found:', profile.username, profile.role, profile.user_id);
    }
  } catch (err) {
    console.error('Profile check exception:', err.message);
  }

  // Test 3: Check auth user by ID
  console.log('\n=== TEST 3: Auth User by ID ===');
  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Auth users error:', authError.message);
    } else {
      const adminUser = authUsers.users.find(u => u.email === 'admin@vofc.gov');
      if (adminUser) {
        console.log('✅ Auth user found:', adminUser.email, adminUser.id);
        console.log('   Email confirmed:', adminUser.email_confirmed_at);
        console.log('   Created at:', adminUser.created_at);
      } else {
        console.error('❌ Admin user not found in auth.users');
      }
    }
  } catch (err) {
    console.error('Auth users exception:', err.message);
  }

  // Test 4: Simulate the exact login flow
  console.log('\n=== TEST 4: Simulate Login Flow ===');
  try {
    // Step 1: Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@vofc.gov',
      password: 'Admin123!'
    });

    if (authError) {
      console.error('Auth step failed:', authError.message);
      return;
    }

    console.log('✅ Auth successful:', authData.user.email, authData.user.id);

    // Step 2: Get profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, first_name, last_name, organization, is_active')
      .eq('user_id', authData.user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError.message);
    } else if (!profile) {
      console.error('❌ Profile not found');
    } else {
      console.log('✅ Profile found:', profile);
    }
  } catch (err) {
    console.error('Login flow exception:', err.message);
  }
}

testProductionLogin().catch(console.error);
