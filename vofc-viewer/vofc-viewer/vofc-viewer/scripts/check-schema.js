// Check the actual database schema
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...');
  
  // Get all tables
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
  
  if (tablesError) {
    console.error('Error getting tables:', tablesError);
    return;
  }
  
  console.log('📋 Tables found:');
  tables.forEach(table => console.log(`  - ${table.table_name}`));
  
  // Check specific tables we care about
  const importantTables = ['options_for_consideration', 'sources', 'ofc_sources', 'vulnerabilities'];
  
  for (const tableName of importantTables) {
    console.log(`\n📊 Checking ${tableName}:`);
    
    // Get table structure
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', tableName);
    
    if (columnsError) {
      console.log(`  ❌ Table ${tableName} not found or error: ${columnsError.message}`);
    } else if (columns.length === 0) {
      console.log(`  ❌ Table ${tableName} not found`);
    } else {
      console.log(`  ✅ Table ${tableName} exists with columns:`);
      columns.forEach(col => {
        console.log(`    - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      
      // Get sample data
      const { data: sample, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(2);
      
      if (!sampleError && sample.length > 0) {
        console.log(`  📄 Sample data (${sample.length} records):`);
        console.log(`    ${JSON.stringify(sample[0], null, 2)}`);
      }
    }
  }
}

checkSchema();














