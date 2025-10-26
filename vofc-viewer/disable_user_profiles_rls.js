require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function disableUserProfilesRLS() {
  try {
    console.log('🔧 Disabling RLS on user_profiles table...');
    
    // First, let's check if we can query the table at all
    console.log('1. Testing current access...');
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('user_id, role, username')
      .limit(1);
    
    if (testError) {
      console.log('   ❌ Current access failed:', testError.message);
    } else {
      console.log('   ✅ Current access working');
    }
    
    // Try to disable RLS using a direct SQL approach
    console.log('2. Attempting to disable RLS...');
    
    // Since we can't execute DDL through the client, let's try a different approach
    // We'll create a simple policy that allows all access for service role
    
    console.log('3. Testing with service role bypass...');
    
    // Test if we can query with service role
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('   ❌ Service role query failed:', profilesError.message);
      
      // If service role fails, we need to fix this at the database level
      console.log('\n🚨 CRITICAL: Service role cannot access user_profiles table');
      console.log('   This indicates a serious RLS configuration issue.');
      console.log('   Manual intervention required in Supabase dashboard:');
      console.log('   1. Go to Authentication > Policies');
      console.log('   2. Find user_profiles table');
      console.log('   3. Disable RLS or fix policies');
      console.log('   4. Or contact database administrator');
      
    } else {
      console.log('   ✅ Service role access working');
      console.log('   📊 Found profiles:', profiles.length);
      
      // Test specific user lookup
      const testUserId = '7fc5500f-7b99-499a-ae28-be47f7adc997';
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', testUserId)
        .single();
      
      if (userError) {
        console.error('   ❌ User profile lookup failed:', userError.message);
      } else {
        console.log('   ✅ User profile lookup successful');
        console.log('   👤 User:', userProfile.username, '(' + userProfile.role + ')');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

disableUserProfilesRLS();
