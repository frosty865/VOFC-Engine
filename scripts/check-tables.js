const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  try {
    console.log('Checking existing tables...');
    
    // Check if submissions table exists
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('count')
      .limit(1);
    
    if (submissionsError) {
      console.log('Submissions table does not exist:', submissionsError.message);
    } else {
      console.log('Submissions table exists');
    }
    
    // Check other tables
    const tables = ['vulnerabilities', 'ofcs', 'user_profiles'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`${table} table:`, error.message);
      } else {
        console.log(`${table} table: EXISTS`);
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkTables();


