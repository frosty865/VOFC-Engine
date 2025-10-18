const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLoginFlow() {
  console.log('🔍 Testing login flow...\n');

  try {
    // Test the authentication function directly
    console.log('📊 Testing authenticate_user function...');
    const { data: authResult, error: authError } = await supabase
      .rpc('authenticate_user', {
        p_username: 'admin',
        p_password: 'AdminSecure2024!'
      });

    if (authError) {
      console.log('❌ Authentication failed:', authError.message);
      return;
    }

    console.log('✅ Authentication successful:');
    console.log('User ID:', authResult[0].user_id);
    console.log('Username:', authResult[0].username);
    console.log('Role:', authResult[0].role);
    console.log('Success:', authResult[0].success);

    // Test creating a session
    console.log('\n📊 Testing session creation...');
    const { data: sessionResult, error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: authResult[0].user_id,
        session_token: 'test-session-' + Date.now(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select();

    if (sessionError) {
      console.log('❌ Session creation failed:', sessionError.message);
    } else {
      console.log('✅ Session created successfully');
    }

    // Test role check
    console.log('\n📊 Testing role check...');
    const userRole = authResult[0].role;
    const hasAdminAccess = userRole === 'admin' || userRole === 'spsa' || userRole === 'analyst';
    console.log('User role:', userRole);
    console.log('Has admin access:', hasAdminAccess);

    if (hasAdminAccess) {
      console.log('✅ User should have admin access');
    } else {
      console.log('❌ User does not have admin access');
    }

  } catch (error) {
    console.error('❌ Login flow test failed:', error);
  }
}

if (require.main === module) {
  testLoginFlow()
    .then(() => {
      console.log('\n✅ Login flow test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Login flow test error:', error);
      process.exit(1);
    });
}

module.exports = { testLoginFlow };
