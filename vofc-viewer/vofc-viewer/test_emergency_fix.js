require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testEmergencyFix() {
  try {
    console.log('🚨 Testing emergency RLS fix...');
    
    console.log('📋 MANUAL STEPS REQUIRED:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Execute the contents of sql/emergency_disable_rls.sql');
    console.log('3. This will completely disable RLS on user_profiles');
    console.log('4. Then run this test again');
    console.log('');
    
    // Test current state
    console.log('🧪 Testing current state...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Query failed:', profilesError.message);
      if (profilesError.message.includes('infinite recursion')) {
        console.log('🚨 RLS recursion still present - execute emergency_disable_rls.sql');
      }
    } else {
      console.log('✅ Query successful:', profiles.length, 'profiles');
      console.log('📋 Profile data:', profiles);
    }
    
    // Test auth flow
    console.log('🧪 Testing auth flow...');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@vofc.gov',
      password: 'Admin123!'
    });
    
    if (authError) {
      console.error('❌ Auth failed:', authError.message);
      return;
    }
    
    console.log('✅ Auth successful:', authData.user.email);
    
    // Test profile lookup
    console.log('🧪 Testing profile lookup...');
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile lookup failed:', profileError.message);
    } else {
      console.log('✅ Profile lookup successful:', profile.role);
      console.log('🎉 Emergency fix working!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testEmergencyFix();
