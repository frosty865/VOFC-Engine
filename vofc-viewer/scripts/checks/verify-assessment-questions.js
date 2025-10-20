const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAssessmentQuestions() {
  console.log('🔍 Verifying assessment_questions table...\n');

  try {
    // Get all questions
    const { data: questions, error } = await supabase
      .from('assessment_questions')
      .select('*')
      .order('created_at');

    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }

    console.log(`📊 Total questions in table: ${questions.length}`);
    
    if (questions.length === 0) {
      console.log('❌ Table is still empty!');
      return;
    }

    console.log('\n📋 All questions in the table:');
    questions.forEach((q, i) => {
      console.log(`${i+1}. ${q.question_text}`);
    });

    console.log('\n📊 Summary:');
    console.log(`   Total questions: ${questions.length}`);
    console.log(`   Root questions: ${questions.filter(q => q.is_root).length}`);
    console.log(`   With English: ${questions.filter(q => q.question_en).length}`);
    console.log(`   With Spanish: ${questions.filter(q => q.question_es).length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyAssessmentQuestions();

