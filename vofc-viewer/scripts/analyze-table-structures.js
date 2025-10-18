const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeTableStructures() {
  console.log('🔍 ANALYZING TABLE STRUCTURES...\n');

  const keyTables = [
    'vofc_users',
    'vulnerabilities', 
    'options_for_consideration',
    'assessment_questions',
    'sources',
    'sectors',
    'subsectors'
  ];

  for (const tableName of keyTables) {
    try {
      console.log(`📋 ANALYZING: ${tableName}`);
      console.log('='.repeat(50));
      
      // Get a sample record to understand structure
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (sampleError) {
        console.log(`❌ Error: ${sampleError.message}`);
        continue;
      }

      if (sampleData && sampleData.length > 0) {
        const record = sampleData[0];
        console.log('📊 COLUMN STRUCTURE:');
        
        Object.keys(record).forEach(key => {
          const value = record[key];
          const type = typeof value;
          const isNull = value === null;
          const isUUID = typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
          
          console.log(`   • ${key}: ${type} ${isNull ? '(NULL)' : ''} ${isUUID ? '(UUID)' : ''}`);
          if (!isNull && type === 'string' && value.length > 0 && value.length < 100) {
            console.log(`     Sample: "${value}"`);
          }
        });
      } else {
        console.log('📊 No data found in table');
      }

      // Get record count
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (!countError) {
        console.log(`📊 Record count: ${count || 0}`);
      }

      console.log('\n');

    } catch (error) {
      console.log(`❌ Error analyzing ${tableName}: ${error.message}\n`);
    }
  }

  console.log('🎯 SCHEMA OVERHAUL RECOMMENDATIONS...\n');
  
  console.log('📋 IDENTIFIED ISSUES:');
  console.log('   • Multiple tables with different ID formats (UUID vs SERIAL)');
  console.log('   • Inconsistent naming conventions');
  console.log('   • Potential data type mismatches');
  console.log('   • Missing relationships between tables');
  
  console.log('\n🔧 PROPOSED OVERHAUL PLAN:');
  console.log('   1. Standardize ID columns (use UUID for all)');
  console.log('   2. Implement consistent naming conventions');
  console.log('   3. Add proper foreign key relationships');
  console.log('   4. Update RLS policies');
  console.log('   5. Create migration scripts');
  console.log('   6. Test data integrity');
}

if (require.main === module) {
  analyzeTableStructures()
    .then(() => {
      console.log('\n✅ Table structure analysis completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script error:', error);
      process.exit(1);
    });
}

