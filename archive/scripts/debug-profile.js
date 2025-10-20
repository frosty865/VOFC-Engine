const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugProfile() {
  try {
    console.log('Logging in...');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@vofc.gov',
      password: 'Admin123!'
    });
    
    if (authError) {
      console.error('Auth error:', authError);
      return;
    }
    
    console.log('Logged in as:', authData.user.email);
    console.log('User ID:', authData.user.id);
    
    // Try to get all profiles first
    console.log('\nFetching all profiles...');
    const { data: allProfiles, error: allError } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (allError) {
      console.error('Error fetching all profiles:', allError);
    } else {
      console.log('All profiles:', allProfiles);
    }
    
    // Try to get admin profile specifically
    console.log('\nFetching admin profile...');
    const { data: adminProfile, error: adminError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', 'admin');
    
    if (adminError) {
      console.error('Error fetching admin profile:', adminError);
    } else {
      console.log('Admin profile:', adminProfile);
    }
    
    // Try to get profile by user_id
    console.log('\nFetching profile by user_id...');
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', authData.user.id);
    
    if (userError) {
      console.error('Error fetching user profile:', userError);
    } else {
      console.log('User profile:', userProfile);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugProfile();


