// Check the actual database schema
const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...');
  
  // Check specific tables we care about
  const importantTables = ['options_for_consideration', 'sources', 'ofc_sources', 'vulnerabilities'];
  
  for (const tableName of importantTables) {
    console.log(`\n📊 Checking ${tableName}:`);
    
    try {
      // Get sample data to see structure
      const { data: sample, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(2);
      
      if (sampleError) {
        console.log(`  ❌ Table ${tableName} error: ${sampleError.message}`);
      } else if (sample.length === 0) {
        console.log(`  ⚠️  Table ${tableName} exists but is empty`);
      } else {
        console.log(`  ✅ Table ${tableName} exists with ${sample.length} sample records:`);
        console.log(`    Fields: ${Object.keys(sample[0]).join(', ')}`);
        console.log(`    Sample: ${JSON.stringify(sample[0], null, 2)}`);
      }
    } catch (err) {
      console.log(`  ❌ Table ${tableName} not accessible: ${err.message}`);
    }
  }
  
  // Check if sources are stored directly in options_for_consideration
  console.log('\n🔍 Checking if sources are in options_for_consideration table:');
  try {
    const { data: ofcs, error } = await supabase
      .from('options_for_consideration')
      .select('*')
      .limit(3);
    
    if (!error && ofcs.length > 0) {
      const hasSources = ofcs.some(ofc => ofc.sources !== undefined);
      console.log(`  Sources field exists: ${hasSources}`);
      
      if (hasSources) {
        const withSources = ofcs.filter(ofc => ofc.sources);
        console.log(`  OFCs with sources: ${withSources.length}/${ofcs.length}`);
        if (withSources.length > 0) {
          console.log(`  Sample sources: ${withSources[0].sources}`);
        }
      }
    }
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }
}

checkSchema();
