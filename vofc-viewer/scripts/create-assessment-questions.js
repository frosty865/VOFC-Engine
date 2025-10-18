const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Sample assessment questions for different security domains
const assessmentQuestions = [
  {
    question_text: "Are security cameras properly positioned and functioning to monitor critical areas?",
    sector_id: 1,
    technology_class: "Physical Security",
    discipline: "Physical Security",
    question_type: "assessment"
  },
  {
    question_text: "Is access control properly implemented and functioning at all entry points?",
    sector_id: 1,
    technology_class: "Physical Security", 
    discipline: "Physical Security",
    question_type: "assessment"
  },
  {
    question_text: "Are intrusion detection and alarm systems properly installed and operational?",
    sector_id: 1,
    technology_class: "Physical Security",
    discipline: "Physical Security", 
    question_type: "assessment"
  },
  {
    question_text: "Is perimeter lighting adequate and properly maintained for security purposes?",
    sector_id: 1,
    technology_class: "Physical Security",
    discipline: "Physical Security",
    question_type: "assessment"
  },
  {
    question_text: "Are perimeter barriers and fencing adequate and properly maintained?",
    sector_id: 1,
    technology_class: "Physical Security",
    discipline: "Physical Security",
    question_type: "assessment"
  },
  {
    question_text: "Is security personnel properly trained and positioned to monitor facility security?",
    sector_id: 1,
    technology_class: "Physical Security",
    discipline: "Personnel Security",
    question_type: "assessment"
  },
  {
    question_text: "Are fire safety systems properly installed and regularly tested?",
    sector_id: 1,
    technology_class: "Safety Systems",
    discipline: "Operational Security",
    question_type: "assessment"
  },
  {
    question_text: "Are cybersecurity measures properly implemented and regularly updated?",
    sector_id: 1,
    technology_class: "Information Technology",
    discipline: "Cybersecurity",
    question_type: "assessment"
  },
  {
    question_text: "Are backup power systems properly installed and regularly tested?",
    sector_id: 1,
    technology_class: "Infrastructure",
    discipline: "Operational Security",
    question_type: "assessment"
  },
  {
    question_text: "Are emergency communication systems properly installed and functional?",
    sector_id: 1,
    technology_class: "Communication Systems",
    discipline: "Operational Security",
    question_type: "assessment"
  }
];

async function createAssessmentQuestions() {
  console.log('📝 Creating assessment questions...\n');

  try {
    // First, check if questions table exists and has data
    const { data: existingQuestions, error: checkError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);

    if (checkError) {
      console.log('❌ Questions table error:', checkError.message);
      return;
    }

    if (existingQuestions && existingQuestions.length > 0) {
      console.log(`✅ Questions table already has ${existingQuestions.length} questions`);
      console.log('Sample question:', existingQuestions[0].question_text);
      return;
    }

    // Insert assessment questions
    console.log('📝 Inserting assessment questions...');
    const { data, error } = await supabase
      .from('questions')
      .insert(assessmentQuestions)
      .select();

    if (error) {
      console.error('❌ Error inserting questions:', error);
    } else {
      console.log(`✅ Successfully inserted ${data.length} assessment questions`);
      console.log('\n📋 Sample questions created:');
      data.slice(0, 3).forEach((q, i) => {
        console.log(`   ${i+1}. ${q.question_text}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createAssessmentQuestions();
