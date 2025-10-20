const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLogin() {
  try {
    console.log('Testing login with admin credentials...');
    
    // Test login with admin credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@vofc.gov',
      password: 'Admin123!'
    });
    
    if (error) {
      console.error('❌ Login failed:', error.message);
      return;
    }
    
    console.log('✅ Login successful!');
    console.log('User ID:', data.user?.id);
    console.log('Email:', data.user?.email);
    console.log('Session:', data.session ? 'Active' : 'No session');
    
    // Test getting user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', 'admin')
      .single();
    
    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError.message);
    } else {
      console.log('✅ Profile found:', profile);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();


