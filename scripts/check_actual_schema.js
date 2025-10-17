const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActualSchema() {
  console.log('Checking actual database schema...\n');
  
  try {
    // Try to get all tables from information_schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('Could not access information_schema:', tablesError.message);
    } else {
      console.log('Available tables:', tables.map(t => t.table_name));
    }
    
    // Check specific tables that might exist
    const possibleTables = [
      'users', 'user_profiles', 'questions', 'question', 
      'vulnerabilities', 'vulnerability', 'ofcs', 'ofc', 
      'sources', 'source', 'answers', 'parent_questions',
      'conditional_relationships', 'question_ofc_map'
    ];
    
    for (const table of possibleTables) {
      console.log(`\n=== Checking ${table} ===`);
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table} exists`);
          if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
            console.log('Sample data:', JSON.stringify(data[0], null, 2));
          } else {
            console.log('Table is empty');
          }
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkActualSchema();


