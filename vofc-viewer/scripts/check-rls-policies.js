const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS policies for recursion issues...\n');

  try {
    // Check current RLS policies on vofc_users
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { table_name: 'vofc_users' });

    if (policiesError) {
      console.log('❌ Could not fetch policies:', policiesError.message);
      
      // Try alternative approach - query information_schema
      const { data: policyData, error: policyError } = await supabase
        .from('information_schema.table_privileges')
        .select('*')
        .eq('table_name', 'vofc_users');

      if (policyError) {
        console.log('❌ Could not fetch policy info:', policyError.message);
      } else {
        console.log('📊 Policy info:', policyData);
      }
    } else {
      console.log('📊 Current policies on vofc_users:');
      console.log(JSON.stringify(policies, null, 2));
    }

    // Test the problematic query that causes recursion
    console.log('\n🧪 Testing queries that might cause recursion...\n');
    
    try {
      // This is the query that likely causes recursion
      const { data: testData, error: testError } = await supabase
        .from('vofc_users')
        .select('*')
        .limit(1);

      if (testError) {
        console.log('❌ Query failed:', testError.message);
      } else {
        console.log('✅ Query succeeded');
      }
    } catch (err) {
      console.log('❌ Query error:', err.message);
    }

    // Check if there are any circular references in policies
    console.log('\n🔍 Looking for potential circular references...\n');
    
    // Check if vofc_users policies reference themselves
    const { data: selfRef, error: selfRefError } = await supabase
      .from('vofc_users')
      .select('user_id, role')
      .eq('role', 'admin')
      .limit(1);

    if (selfRefError) {
      console.log('❌ Self-reference test failed:', selfRefError.message);
    } else {
      console.log('✅ Self-reference test passed');
    }

  } catch (error) {
    console.error('❌ RLS check failed:', error);
  }
}

if (require.main === module) {
  checkRLSPolicies()
    .then(() => {
      console.log('\n✅ RLS policy check completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ RLS policy check error:', error);
      process.exit(1);
    });
}

module.exports = { checkRLSPolicies };
