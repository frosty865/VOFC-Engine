const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' }); // Use the correct .env file

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    question_text: "Are background checks conducted for all personnel with access to sensitive areas?",
    sector_id: 1,
    technology_class: "Personnel Security",
    discipline: "Personnel Security",
    question_type: "assessment"
  },
  {
    question_text: "Is there a clear chain of command and reporting structure for security personnel?",
    sector_id: 1,
    technology_class: "Personnel Security",
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
  },
  {
    question_text: "Are emergency evacuation procedures clearly posted and regularly practiced?",
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
    question_text: "Are network security controls properly configured and monitored?",
    sector_id: 1,
    technology_class: "Information Technology",
    discipline: "Cybersecurity",
    question_type: "assessment"
  },
  {
    question_text: "Are data backup and recovery procedures properly implemented?",
    sector_id: 1,
    technology_class: "Information Technology",
    discipline: "Cybersecurity",
    question_type: "assessment"
  },
  {
    question_text: "Are security policies and procedures clearly documented and communicated?",
    sector_id: 1,
    technology_class: "General",
    discipline: "General Security",
    question_type: "assessment"
  },
  {
    question_text: "Are security incidents properly reported and investigated?",
    sector_id: 1,
    technology_class: "General",
    discipline: "General Security",
    question_type: "assessment"
  },
  {
    question_text: "Are security assessments conducted regularly and findings addressed?",
    sector_id: 1,
    technology_class: "General",
    discipline: "General Security",
    question_type: "assessment"
  }
];

async function populateAssessmentQuestions() {
  console.log('📝 Populating assessment_questions table...\n');

  try {
    // First check if table exists and is empty
    const { data: existingQuestions, error: checkError } = await supabase
      .from('assessment_questions')
      .select('*')
      .limit(1);

    if (checkError) {
      console.log('❌ Error checking assessment_questions table:', checkError.message);
      return;
    }

    if (existingQuestions && existingQuestions.length > 0) {
      console.log(`✅ assessment_questions table already has ${existingQuestions.length} questions`);
      console.log('Sample question:', existingQuestions[0].question_text);
      return;
    }

    console.log('📝 Inserting assessment questions...');
    const { data, error } = await supabase
      .from('assessment_questions')
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

populateAssessmentQuestions();
