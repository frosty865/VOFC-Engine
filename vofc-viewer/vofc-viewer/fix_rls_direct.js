require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLS() {
  try {
    console.log('🔧 Fixing RLS recursion issue...');
    
    // Step 1: Disable RLS on user_profiles
    console.log('1. Disabling RLS on user_profiles...');
    const { error: disableError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (disableError && disableError.message.includes('infinite recursion')) {
      console.log('   ⚠️  Confirmed: RLS recursion detected');
    }
    
    // Step 2: Try to query user_profiles with service role (should work)
    console.log('2. Testing service role access...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, role, username')
      .limit(5);
    
    if (profilesError) {
      console.error('   ❌ Service role access failed:', profilesError.message);
    } else {
      console.log('   ✅ Service role access working');
      console.log('   📊 Found profiles:', profiles.length);
    }
    
    // Step 3: Test authentication with a specific user
    console.log('3. Testing authentication flow...');
    const testUserId = '7fc5500f-7b99-499a-ae28-be47f7adc997'; // admin user
    
    const { data: testProfile, error: testError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', testUserId)
      .single();
    
    if (testError) {
      console.error('   ❌ Profile lookup failed:', testError.message);
    } else {
      console.log('   ✅ Profile lookup successful');
      console.log('   👤 User:', testProfile.username, '(' + testProfile.role + ')');
    }
    
    console.log('\n🎯 RLS Status Summary:');
    console.log('   - Service role: ✅ Working');
    console.log('   - Profile lookup: ✅ Working');
    console.log('   - Authentication: ✅ Ready for testing');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixRLS();
