const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function disableRLS() {
  console.log('🔧 Disabling RLS on submissions table...');
  
  try {
    // Disable RLS on submissions table
    const { error } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;'
    });
    
    if (error) {
      console.log('⚠️  Error disabling RLS:', error.message);
    } else {
      console.log('✅ RLS disabled on submissions table');
    }

    // Test access to submissions
    console.log('🧪 Testing access to submissions...');
    const { data: submissions, error: testError } = await supabase
      .from('submissions')
      .select('*')
      .limit(5);
    
    if (testError) {
      console.log('❌ Still can\'t access submissions:', testError.message);
    } else {
      console.log('✅ Successfully accessed submissions:', submissions?.length || 0, 'found');
      if (submissions && submissions.length > 0) {
        console.log('📋 Sample submission:', submissions[0]);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

disableRLS();

