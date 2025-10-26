require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSimpleAdmin() {
  try {
    console.log('👤 Creating simple admin user...');
    
    // Step 1: Create admin user in Supabase Auth
    console.log('1. Creating auth user...');
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@vofc.gov',
      password: 'Admin123!',
      email_confirm: true,
      user_metadata: {
        first_name: 'Admin',
        last_name: 'User'
      }
    });
    
    if (authError) {
      console.error('   ❌ Auth user creation failed:', authError.message);
      return;
    }
    
    console.log('   ✅ Auth user created:', authData.user.email);
    
    // Step 2: Create user profile
    console.log('2. Creating user profile...');
    
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        email: authData.user.email,
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User',
        organization: 'VOFC',
        is_active: true
      })
      .select()
      .single();
    
    if (profileError) {
      console.error('   ❌ Profile creation failed:', profileError.message);
      return;
    }
    
    console.log('   ✅ User profile created:', profileData.role);
    
    // Step 3: Test the complete flow
    console.log('3. Testing authentication flow...');
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@vofc.gov',
      password: 'Admin123!'
    });
    
    if (loginError) {
      console.error('   ❌ Login test failed:', loginError.message);
      return;
    }
    
    console.log('   ✅ Login successful:', loginData.user.email);
    
    // Step 4: Test profile lookup
    console.log('4. Testing profile lookup...');
    
    const { data: testProfile, error: testError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', loginData.user.id)
      .single();
    
    if (testError) {
      console.error('   ❌ Profile lookup failed:', testError.message);
      return;
    }
    
    console.log('   ✅ Profile lookup successful:', testProfile.role);
    
    console.log('\n🎉 Simple admin user created successfully!');
    console.log('   👤 Email: admin@vofc.gov');
    console.log('   🔑 Password: Admin123!');
    console.log('   🎯 Role: admin');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createSimpleAdmin();
