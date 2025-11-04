const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugProductionAuth() {
  console.log('Debugging production authentication...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Test 1: Check auth users
    console.log('\n=== AUTH USERS ===');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Auth users error:', authError.message);
    } else {
      console.log(`Found ${authUsers.users.length} auth users:`);
      authUsers.users.forEach(u => console.log(`- ${u.email} (${u.id})`));
    }

    // Test 2: Check user profiles
    console.log('\n=== USER PROFILES ===');
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (profileError) {
      console.error('Profiles error:', profileError.message);
    } else {
      console.log(`Found ${profiles.length} user profiles:`);
      profiles.forEach(p => console.log(`- ${p.username} (${p.role}) - ID: ${p.user_id}`));
    }

    // Test 3: Test direct auth
    console.log('\n=== DIRECT AUTH TEST ===');
    const { data: authData, error: authError2 } = await supabase.auth.signInWithPassword({
      email: 'admin@vofc.gov',
      password: 'Admin123!'
    });

    if (authError2) {
      console.error('❌ Direct auth failed:', authError2.message);
    } else {
      console.log('✅ Direct auth successful:', authData.user.email, authData.user.id);
      
      // Test profile lookup
      const { data: profileData, error: profileError2 } = await supabase
        .from('user_profiles')
        .select('role, first_name, last_name, organization, is_active')
        .eq('user_id', authData.user.id)
        .single();

      if (profileError2) {
        console.error('❌ Profile lookup failed:', profileError2.message);
      } else {
        console.log('✅ Profile lookup successful:', profileData);
      }
    }

    // Test 4: Check if there are any RLS issues
    console.log('\n=== RLS CHECK ===');
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', { 
      sql: `SELECT schemaname, tablename, rowsecurity 
            FROM pg_tables 
            WHERE tablename = 'user_profiles';` 
    });
    
    console.log('RLS Status:', rlsStatus);

  } catch (error) {
    console.error('Exception:', error.message);
  }
}

debugProductionAuth().catch(console.error);
