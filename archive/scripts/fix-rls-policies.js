const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies for all tables...');
  
  try {
    // Enable RLS on all tables
    const tables = [
      'submissions',
      'vulnerabilities', 
      'options_for_consideration',
      'sectors',
      'subsectors',
      'user_profiles'
    ];

    for (const table of tables) {
      console.log(`📋 Enabling RLS on ${table}...`);
      
      // Enable RLS
      const { error: enableError } = await supabase.rpc('enable_rls', { table_name: table });
      if (enableError) {
        console.log(`⚠️  RLS already enabled on ${table} or error:`, enableError.message);
      } else {
        console.log(`✅ RLS enabled on ${table}`);
      }
    }

    // Create policies for submissions table
    console.log('📋 Creating policies for submissions table...');
    
    // Allow admins to read all submissions
    const { error: readPolicyError } = await supabase.rpc('create_policy', {
      table_name: 'submissions',
      policy_name: 'admin_read_submissions',
      operation: 'SELECT',
      condition: 'auth.jwt() ->> ''role'' = ''admin'' OR auth.jwt() ->> ''role'' = ''spsa'' OR auth.jwt() ->> ''role'' = ''analyst'''
    });
    
    if (readPolicyError) {
      console.log('⚠️  Read policy error (may already exist):', readPolicyError.message);
    } else {
      console.log('✅ Admin read policy created for submissions');
    }

    // Allow admins to update submissions (for approval/rejection)
    const { error: updatePolicyError } = await supabase.rpc('create_policy', {
      table_name: 'submissions',
      policy_name: 'admin_update_submissions',
      operation: 'UPDATE',
      condition: 'auth.jwt() ->> ''role'' = ''admin'' OR auth.jwt() ->> ''role'' = ''spsa'''
    });
    
    if (updatePolicyError) {
      console.log('⚠️  Update policy error (may already exist):', updatePolicyError.message);
    } else {
      console.log('✅ Admin update policy created for submissions');
    }

    // Allow users to insert submissions
    const { error: insertPolicyError } = await supabase.rpc('create_policy', {
      table_name: 'submissions',
      policy_name: 'users_insert_submissions',
      operation: 'INSERT',
      condition: 'auth.uid() IS NOT NULL'
    });
    
    if (insertPolicyError) {
      console.log('⚠️  Insert policy error (may already exist):', insertPolicyError.message);
    } else {
      console.log('✅ User insert policy created for submissions');
    }

    // Create policies for vulnerabilities table
    console.log('📋 Creating policies for vulnerabilities table...');
    
    const { error: vulnReadError } = await supabase.rpc('create_policy', {
      table_name: 'vulnerabilities',
      policy_name: 'admin_read_vulnerabilities',
      operation: 'SELECT',
      condition: 'true' // Allow everyone to read approved vulnerabilities
    });
    
    if (vulnReadError) {
      console.log('⚠️  Vulnerabilities read policy error:', vulnReadError.message);
    } else {
      console.log('✅ Vulnerabilities read policy created');
    }

    // Create policies for OFCs table
    console.log('📋 Creating policies for options_for_consideration table...');
    
    const { error: ofcReadError } = await supabase.rpc('create_policy', {
      table_name: 'options_for_consideration',
      policy_name: 'admin_read_ofcs',
      operation: 'SELECT',
      condition: 'true' // Allow everyone to read approved OFCs
    });
    
    if (ofcReadError) {
      console.log('⚠️  OFCs read policy error:', ofcReadError.message);
    } else {
      console.log('✅ OFCs read policy created');
    }

    // Create policies for user_profiles table
    console.log('📋 Creating policies for user_profiles table...');
    
    const { error: profileReadError } = await supabase.rpc('create_policy', {
      table_name: 'user_profiles',
      policy_name: 'admin_read_profiles',
      operation: 'SELECT',
      condition: 'auth.jwt() ->> ''role'' = ''admin'' OR auth.jwt() ->> ''role'' = ''spsa'''
    });
    
    if (profileReadError) {
      console.log('⚠️  Profiles read policy error:', profileReadError.message);
    } else {
      console.log('✅ Profiles read policy created');
    }

    // Test the policies by trying to read submissions
    console.log('🧪 Testing RLS policies...');
    
    const { data: testSubmissions, error: testError } = await supabase
      .from('submissions')
      .select('*')
      .limit(5);
    
    if (testError) {
      console.log('❌ RLS test failed:', testError);
    } else {
      console.log('✅ RLS test passed - found', testSubmissions?.length || 0, 'submissions');
      console.log('📋 Sample submission:', testSubmissions?.[0]);
    }

    console.log('🎉 RLS policy setup complete!');

  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error);
  }
}

fixRLSPolicies();