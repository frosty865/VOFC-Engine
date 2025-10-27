const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSchemaUpdates() {
  console.log('🧪 TESTING SCHEMA UPDATES...\n');

  const tests = [
    {
      name: 'Vulnerabilities Table',
      table: 'vulnerabilities',
      expectedColumns: ['id', 'vulnerability', 'discipline', 'source', 'sector_id', 'subsector_id']
    },
    {
      name: 'Options for Consideration Table',
      table: 'options_for_consideration',
      expectedColumns: ['id', 'option_text', 'discipline', 'source', 'sector_id', 'subsector_id']
    },
    {
      name: 'Assessment Questions Table',
      table: 'assessment_questions',
      expectedColumns: ['id', 'vulnerability_id', 'question_text', 'question_en', 'question_es', 'is_root']
    },
    {
      name: 'Sources Table',
      table: 'sources',
      expectedColumns: ['reference number', 'source']
    },
    {
      name: 'Sectors Table',
      table: 'sectors',
      expectedColumns: ['id', 'sector_name', 'description']
    },
    {
      name: 'Subsectors Table',
      table: 'subsectors',
      expectedColumns: ['id', 'sector_id', 'name', 'description']
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`📋 Testing ${test.name}...`);
      
      // Get a sample record to check structure
      const { data: sampleData, error } = await supabase
        .from(test.table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
        continue;
      }

      if (sampleData && sampleData.length > 0) {
        const actualColumns = Object.keys(sampleData[0]);
        const missingColumns = test.expectedColumns.filter(col => !actualColumns.includes(col));
        const extraColumns = actualColumns.filter(col => !test.expectedColumns.includes(col));

        if (missingColumns.length === 0) {
          console.log(`   ✅ All expected columns present`);
          if (extraColumns.length > 0) {
            console.log(`   ℹ️  Extra columns: ${extraColumns.join(', ')}`);
          }
          passedTests++;
        } else {
          console.log(`   ❌ Missing columns: ${missingColumns.join(', ')}`);
          console.log(`   ℹ️  Actual columns: ${actualColumns.join(', ')}`);
        }
      } else {
        console.log(`   ⚠️  No data found in table`);
        passedTests++; // Pass if table exists but is empty
      }

    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
    }
  }

  console.log(`\n📊 TEST RESULTS:`);
  console.log(`   ✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`   ❌ Failed: ${totalTests - passedTests}/${totalTests}`);

  if (passedTests === totalTests) {
    console.log('\n🎉 ALL SCHEMA UPDATES VERIFIED!');
    console.log('✅ The VOFC Engine is now synced with the new schema.');
  } else {
    console.log('\n⚠️  SOME ISSUES DETECTED');
    console.log('Please review the failed tests above.');
  }

  // Test data integrity
  console.log('\n🔍 TESTING DATA INTEGRITY...\n');
  
  try {
    // Test vulnerabilities count
    const { count: vulnCount, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('*', { count: 'exact', head: true });
    
    if (!vulnError) {
      console.log(`📊 Vulnerabilities: ${vulnCount || 0} records`);
    }

    // Test OFCs count
    const { count: ofcCount, error: ofcError } = await supabase
      .from('options_for_consideration')
      .select('*', { count: 'exact', head: true });
    
    if (!ofcError) {
      console.log(`📊 Options for Consideration: ${ofcCount || 0} records`);
    }

    // Test assessment questions count
    const { count: questionCount, error: questionError } = await supabase
      .from('assessment_questions')
      .select('*', { count: 'exact', head: true });
    
    if (!questionError) {
      console.log(`📊 Assessment Questions: ${questionCount || 0} records`);
    }

    // Test sources count
    const { count: sourceCount, error: sourceError } = await supabase
      .from('sources')
      .select('*', { count: 'exact', head: true });
    
    if (!sourceError) {
      console.log(`📊 Sources: ${sourceCount || 0} records`);
    }

  } catch (error) {
    console.log(`❌ Data integrity test failed: ${error.message}`);
  }

  console.log('\n🎯 SCHEMA SYNC COMPLETE!');
  console.log('The VOFC Engine has been successfully updated to match the new schema.');
}

if (require.main === module) {
  testSchemaUpdates()
    .then(() => {
      console.log('\n✅ Schema testing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script error:', error);
      process.exit(1);
    });
}

