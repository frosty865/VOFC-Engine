const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './vofc-viewer/.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearQuestionText() {
  console.log('🧹 Clearing question_text column in assessment_questions table...\n');

  try {
    // First, let's see what's currently in the table
    console.log('📋 Checking current data...');
    const { data: currentData, error: fetchError } = await supabase
      .from('assessment_questions')
      .select('id, question_text, question_en, question_es')
      .limit(5);

    if (fetchError) {
      console.error('❌ Error fetching data:', fetchError);
      return;
    }

    console.log(`📊 Found ${currentData.length} records (showing first 5):`);
    currentData.forEach((record, index) => {
      console.log(`   ${index + 1}. ID: ${record.id}`);
      console.log(`      question_text: "${record.question_text}"`);
      console.log(`      question_en: "${record.question_en}"`);
      console.log(`      question_es: "${record.question_es}"`);
      console.log('   ---');
    });

    // Clear the question_text column
    console.log('\n🧹 Clearing question_text column...');
    const { error: updateError } = await supabase
      .from('assessment_questions')
      .update({ question_text: null });

    if (updateError) {
      console.error('❌ Error clearing question_text:', updateError);
      return;
    }

    console.log('✅ Successfully cleared question_text column');

    // Verify the update
    console.log('\n📋 Verifying update...');
    const { data: updatedData, error: verifyError } = await supabase
      .from('assessment_questions')
      .select('id, question_text, question_en, question_es')
      .limit(5);

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }

    console.log('📊 Updated records (showing first 5):');
    updatedData.forEach((record, index) => {
      console.log(`   ${index + 1}. ID: ${record.id}`);
      console.log(`      question_text: ${record.question_text}`);
      console.log(`      question_en: "${record.question_en}"`);
      console.log(`      question_es: "${record.question_es}"`);
      console.log('   ---');
    });

    console.log('\n🎉 question_text column successfully cleared!');

  } catch (error) {
    console.error('❌ Error clearing question_text:', error);
  }
}

if (require.main === module) {
  clearQuestionText()
    .then(() => {
      console.log('\n✅ Clear operation completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script error:', error);
      process.exit(1);
    });
}

