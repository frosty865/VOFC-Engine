const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRLS() {
  console.log('🔧 Fixing RLS policies...');
  
  try {
    // Test current access to submissions
    console.log('🧪 Testing current access to submissions...');
    const { data: testData, error: testError } = await supabase
      .from('submissions')
      .select('*')
      .limit(5);
    
    if (testError) {
      console.log('❌ Current access failed:', testError.message);
    } else {
      console.log('✅ Current access works - found', testData?.length || 0, 'submissions');
      if (testData && testData.length > 0) {
        console.log('📋 Sample submission:', testData[0]);
      }
    }

    // Try to create a simple policy that allows admin access
    console.log('🔧 Creating admin read policy...');
    
    const { error: policyError } = await supabase.rpc('exec', {
      sql: `
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "admin_read_submissions" ON submissions;
        
        -- Create new policy for admin access
        CREATE POLICY "admin_read_submissions" ON submissions
          FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM user_profiles 
              WHERE user_profiles.user_id = auth.uid() 
              AND user_profiles.role IN ('admin', 'spsa', 'analyst')
            )
          );
      `
    });
    
    if (policyError) {
      console.log('⚠️  Policy creation error:', policyError.message);
    } else {
      console.log('✅ Admin read policy created successfully');
    }

    // Test access again
    console.log('🧪 Testing access after policy creation...');
    const { data: testData2, error: testError2 } = await supabase
      .from('submissions')
      .select('*')
      .limit(5);
    
    if (testError2) {
      console.log('❌ Access still failed:', testError2.message);
    } else {
      console.log('✅ Access works - found', testData2?.length || 0, 'submissions');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixRLS();

