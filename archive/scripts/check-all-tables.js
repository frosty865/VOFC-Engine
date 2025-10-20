const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAllTables() {
  console.log('Checking all tables in the database...\n');

  try {
    // List of tables to check
    const tables = [
      'vulnerabilities',
      'options_for_consideration', 
      'vulnerability_ofc_links',
      'sources',
      'sectors',
      'subsectors',
      'questions',
      'user_profiles',
      'submissions'
    ];

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: ${data.length} records`);
        }
      } catch (err) {
        console.log(`❌ ${table}: Table does not exist`);
      }
    }

  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkAllTables();


