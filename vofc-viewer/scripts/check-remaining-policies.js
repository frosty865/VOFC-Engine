const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRemainingPolicies() {
  console.log('🔍 Checking for remaining problematic policies...\n');

  try {
    // Test different types of queries to isolate the issue
    console.log('🧪 Testing basic user query...');
    const { data: users, error: usersError } = await supabase
      .from('vofc_users')
      .select('user_id, username, role')
      .limit(1);

    if (usersError) {
      console.log('❌ Users query failed:', usersError.message);
    } else {
      console.log('✅ Users query succeeded');
    }

    // Test admin role check
    console.log('\n🧪 Testing admin role check...');
    const { data: adminUsers, error: adminError } = await supabase
      .from('vofc_users')
      .select('user_id, username, role')
      .eq('role', 'admin')
      .limit(1);

    if (adminError) {
      console.log('❌ Admin query failed:', adminError.message);
    } else {
      console.log('✅ Admin query succeeded');
    }

    // Test session queries
    console.log('\n🧪 Testing session queries...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('session_id, user_id, expires_at')
      .limit(1);

    if (sessionsError) {
      console.log('❌ Sessions query failed:', sessionsError.message);
    } else {
      console.log('✅ Sessions query succeeded');
    }

    // Test sources queries
    console.log('\n🧪 Testing sources queries...');
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('id, title, author')
      .limit(1);

    if (sourcesError) {
      console.log('❌ Sources query failed:', sourcesError.message);
    } else {
      console.log('✅ Sources query succeeded');
    }

    console.log('\n🎉 Policy check completed!');

  } catch (error) {
    console.error('❌ Policy check failed:', error);
  }
}

if (require.main === module) {
  checkRemainingPolicies()
    .then(() => {
      console.log('\n✅ Remaining policy check completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Remaining policy check error:', error);
      process.exit(1);
    });
}

module.exports = { checkRemainingPolicies };
