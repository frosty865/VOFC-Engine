const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testLoginAPI() {
  console.log('Testing login API simulation...');
  
  // Create client with anon key (like the API does)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    console.log('\n=== STEP 1: Supabase Auth ===');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@vofc.gov',
      password: 'Admin123!'
    });

    if (error) {
      console.error('❌ Auth failed:', error.message);
      return;
    }

    console.log('✅ Auth successful:', data.user.email, data.user.id);

    console.log('\n=== STEP 2: Get User Profile ===');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, first_name, last_name, organization, is_active')
      .eq('user_id', data.user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError.message);
      console.error('Error details:', profileError);
    } else if (!profile) {
      console.error('❌ Profile not found');
    } else {
      console.log('✅ Profile found:', profile);
    }

    console.log('\n=== STEP 3: Test with Service Role ===');
    // Try with service role to see if it's a permissions issue
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: serviceProfile, error: serviceError } = await serviceSupabase
      .from('user_profiles')
      .select('role, first_name, last_name, organization, is_active')
      .eq('user_id', data.user.id)
      .single();

    if (serviceError) {
      console.error('❌ Service role profile fetch failed:', serviceError.message);
    } else {
      console.log('✅ Service role profile fetch successful:', serviceProfile);
    }

  } catch (err) {
    console.error('Exception in login test:', err.message);
  }
}

testLoginAPI().catch(console.error);
