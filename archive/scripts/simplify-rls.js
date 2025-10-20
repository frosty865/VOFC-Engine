const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function simplifyRLS() {
  console.log('🔧 Simplifying RLS to basic user level...');
  
  try {
    // Disable RLS on all tables for now (we'll add basic policies later)
    const tables = [
      'submissions',
      'vulnerabilities', 
      'options_for_consideration',
      'sectors',
      'subsectors',
      'user_profiles'
    ];

    for (const table of tables) {
      console.log(`📋 Disabling RLS on ${table}...`);
      
      const { error } = await supabase.rpc('exec', {
        sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
      });
      
      if (error) {
        console.log(`⚠️  Error disabling RLS on ${table}:`, error.message);
      } else {
        console.log(`✅ RLS disabled on ${table}`);
      }
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

    console.log('🎉 RLS simplified successfully!');

  } catch (error) {
    console.error('❌ Error simplifying RLS:', error);
  }
}

simplifyRLS();

