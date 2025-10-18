const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAdminAccess() {
  console.log('🔍 Testing admin access and authentication...\n');

  try {
    // Check admin user
    console.log('📊 Checking admin user...');
    const { data: adminUser, error: adminError } = await supabase
      .from('vofc_users')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (adminError) {
      console.log('❌ Admin user query failed:', adminError.message);
    } else {
      console.log('✅ Admin user found:');
      console.log('Username:', adminUser.username);
      console.log('Role:', adminUser.role);
      console.log('Is Active:', adminUser.is_active);
      console.log('Full Name:', adminUser.full_name);
    }

    // Check all users
    console.log('\n📊 Checking all users...');
    const { data: allUsers, error: allUsersError } = await supabase
      .from('vofc_users')
      .select('username, role, is_active, full_name');

    if (allUsersError) {
      console.log('❌ All users query failed:', allUsersError.message);
    } else {
      console.log('✅ All users:');
      allUsers.forEach((user, idx) => {
        console.log(`${idx + 1}. ${user.username} (${user.role}) - Active: ${user.is_active}`);
      });
    }

    // Test authentication function
    console.log('\n📊 Testing authentication function...');
    const { data: authResult, error: authError } = await supabase
      .rpc('authenticate_user', {
        p_username: 'admin',
        p_password: 'AdminSecure2024!'
      });

    if (authError) {
      console.log('❌ Authentication function failed:', authError.message);
    } else {
      console.log('✅ Authentication result:', authResult);
    }

    // Check user sessions
    console.log('\n📊 Checking user sessions...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .limit(3);

    if (sessionsError) {
      console.log('❌ Sessions query failed:', sessionsError.message);
    } else {
      console.log('✅ Sessions found:', sessions.length);
      if (sessions.length > 0) {
        console.log('Sample session:', sessions[0]);
      }
    }

  } catch (error) {
    console.error('❌ Admin access test failed:', error);
  }
}

if (require.main === module) {
  testAdminAccess()
    .then(() => {
      console.log('\n✅ Admin access test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Admin access test error:', error);
      process.exit(1);
    });
}

module.exports = { testAdminAccess };

