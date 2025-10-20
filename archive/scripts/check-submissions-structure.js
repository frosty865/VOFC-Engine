const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSubmissionsStructure() {
  try {
    console.log('Checking submissions table structure...\n');
    
    // Get a sample submission to see the structure
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error fetching submissions:', error.message);
      return;
    }
    
    if (submissions.length > 0) {
      console.log('✅ Submissions table structure:');
      console.log(JSON.stringify(submissions[0], null, 2));
    } else {
      console.log('No submissions found. Let me check the table schema...');
      
      // Try to get table info
      const { data: tableInfo, error: tableError } = await supabase
        .from('submissions')
        .select('*')
        .limit(0);
      
      if (tableError) {
        console.log('❌ Error accessing submissions table:', tableError.message);
      } else {
        console.log('✅ Submissions table is accessible but empty');
      }
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

checkSubmissionsStructure();


