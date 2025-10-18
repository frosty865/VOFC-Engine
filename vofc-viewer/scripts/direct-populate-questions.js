// Direct population of assessment questions
// This script will help you populate the assessment_questions table

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

console.log('📋 Assessment Questions for Supabase Dashboard:');
console.log('===============================================\n');

console.log('Copy and paste this SQL into your Supabase SQL Editor:');
console.log('\n-- Create assessment_questions table if it doesn\'t exist');
console.log('CREATE TABLE IF NOT EXISTS assessment_questions (');
console.log('    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
console.log('    question_text TEXT NOT NULL,');
console.log('    sector_id INTEGER DEFAULT 1,');
console.log('    technology_class TEXT,');
console.log('    discipline TEXT,');
console.log('    question_type TEXT DEFAULT \'assessment\',');
console.log('    created_at TIMESTAMPTZ DEFAULT NOW(),');
console.log('    updated_at TIMESTAMPTZ DEFAULT NOW()');
console.log(');\n');

console.log('-- Insert assessment questions');
console.log('INSERT INTO assessment_questions (question_text, sector_id, technology_class, discipline, question_type) VALUES');

assessmentQuestions.forEach((q, index) => {
  const isLast = index === assessmentQuestions.length - 1;
  console.log(`('${q.question_text}', ${q.sector_id}, '${q.technology_class}', '${q.discipline}', '${q.question_type}')${isLast ? ';' : ','}`);
});

console.log('\n-- Enable RLS');
console.log('ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;');
console.log('\n-- Create RLS policies');
console.log('CREATE POLICY "Allow public read access to assessment_questions" ON assessment_questions FOR SELECT USING (true);');
console.log('CREATE POLICY "Allow admin to manage assessment_questions" ON assessment_questions FOR ALL USING (');
console.log('    EXISTS (SELECT 1 FROM vofc_users WHERE user_id = auth.uid() AND role = \'admin\')');
console.log(') WITH CHECK (');
console.log('    EXISTS (SELECT 1 FROM vofc_users WHERE user_id = auth.uid() AND role = \'admin\')');
console.log(');');

console.log('\n🎉 Copy the above SQL and run it in your Supabase SQL Editor!');
