const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNewSchema() {
  console.log('Checking new database schema...\n');
  
  try {
    // Check if new tables exist
    const tables = ['questions', 'vulnerabilities', 'ofcs', 'question_ofc_map'];
    
    for (const table of tables) {
      console.log(`\n=== ${table.toUpperCase()} TABLE ===`);
      
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(5);
        
        if (error) {
          console.log(`❌ Error accessing ${table}:`, error.message);
        } else {
          console.log(`✅ ${table} accessible`);
          console.log(`📊 Sample data (${data.length} rows):`);
          if (data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
            console.log('Sample row:', JSON.stringify(data[0], null, 2));
          }
        }
      } catch (err) {
        console.log(`❌ ${table} table not found or accessible`);
      }
    }
    
    // Check for any other tables
    console.log('\n=== CHECKING FOR OTHER TABLES ===');
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (!error && data) {
        console.log('Available tables:', data.map(t => t.table_name));
      }
    } catch (err) {
      console.log('Could not list tables');
    }
    
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkNewSchema();
