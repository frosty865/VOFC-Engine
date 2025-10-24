const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAssessmentQuestions() {
  console.log('🔍 Checking for assessment questions...\n');

  // Check different possible table names for questions
  const possibleTables = [
    'questions',
    'assessment_questions', 
    'readiness_resilience_assessment',
    'control_objective',
    'question'
  ];

  for (const table of possibleTables) {
    try {
      console.log(`\n📋 Checking ${table}...`);
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(3);

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${count || 0} records`);
        if (data && data.length > 0) {
          console.log(`   Sample question:`, JSON.stringify(data[0], null, 2));
        } else {
          console.log(`   Table is empty`);
        }
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  // Also check if we can find any questions in other tables
  console.log('\n🔍 Checking for question-related data in other tables...');
  
  try {
    const { data: ofcs, error: ofcsError } = await supabase
      .from('options_for_consideration')
      .select('option_text')
      .limit(3);

    if (!ofcsError && ofcs && ofcs.length > 0) {
      console.log('✅ Found OFCs (Options for Consideration):');
      ofcs.forEach((ofc, i) => {
        console.log(`   ${i+1}. ${ofc.option_text.substring(0, 100)}...`);
      });
    }
  } catch (err) {
    console.log('❌ Could not check OFCs:', err.message);
  }
}

checkAssessmentQuestions();

