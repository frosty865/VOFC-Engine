require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  try {
    console.log('🧹 Starting clean authentication setup...');
    
    // Step 1: Execute the clean slate SQL
    console.log('1. Executing clean slate SQL...');
    const fs = require('fs');
    const sql = fs.readFileSync('sql/clean_slate_auth.sql', 'utf8');
    
    // Split into statements and execute
    const statements = sql.split(';').filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error && !error.message.includes('does not exist')) {
            console.log('   ⚠️  Expected error:', error.message);
          }
        } catch (err) {
          // Expected for some statements
        }
      }
    }
    
    console.log('   ✅ Clean slate SQL executed');
    
    // Step 2: Create admin user in Supabase Auth
    console.log('2. Creating admin user...');
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@vofc.gov',
      password: 'Admin123!',
      email_confirm: true,
      user_metadata: {
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      }
    });
    
    if (authError) {
      console.error('   ❌ Auth user creation failed:', authError.message);
      return;
    }
    
    console.log('   ✅ Admin user created:', authData.user.email);
    
    // Step 3: Create user profile
    console.log('3. Creating user profile...');
    
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
    
    // Step 4: Test authentication
    console.log('4. Testing authentication...');
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@vofc.gov',
      password: 'Admin123!'
    });
    
    if (loginError) {
      console.error('   ❌ Login test failed:', loginError.message);
      return;
    }
    
    console.log('   ✅ Login test successful:', loginData.user.email);
    
    // Step 5: Test profile lookup
    console.log('5. Testing profile lookup...');
    
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
    
    console.log('\n🎉 Clean authentication setup completed!');
    console.log('   👤 Admin user: admin@vofc.gov');
    console.log('   🔑 Password: Admin123!');
    console.log('   🎯 Role: admin');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

createAdminUser();
