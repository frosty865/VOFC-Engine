const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

// Use the anon key (same as client-side)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testClientLogin() {
  try {
    console.log('Testing client-side login with anon key...');
    
    // Test login with admin credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@vofc.gov',
      password: 'Admin123!'
    });
    
    if (error) {
      console.error('❌ Client login failed:', error.message);
      return;
    }
    
    console.log('✅ Client login successful!');
    console.log('User ID:', data.user?.id);
    console.log('Email:', data.user?.email);
    console.log('Session:', data.session ? 'Active' : 'No session');
    
    // Test getting user profile with RLS
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

testClientLogin();


