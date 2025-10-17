#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupMainSchema() {
  console.log('🔧 Setting up main VOFC database schema...\n');
  
  try {
    // Test if tables already exist
    console.log('1. Checking existing tables...');
    
    const { data: sectors, error: sectorsError } = await supabase
      .from('sectors')
      .select('*', { head: true, count: 'exact' });
    
    if (sectorsError && sectorsError.code === 'PGRST116') {
      console.log('📝 Tables do not exist yet. You need to run the SQL schema manually.');
      console.log('📋 Please copy and run this SQL in your Supabase SQL editor:');
      console.log(`
-- Sectors table
CREATE TABLE IF NOT EXISTS sectors (
  sector_id SERIAL PRIMARY KEY,
  sector_name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  sector_id INTEGER REFERENCES sectors(sector_id),
  parent_id UUID REFERENCES questions(question_id),
  conditional_trigger TEXT,
  technology_class TEXT,
  source_doc TEXT,
  page_number INTEGER,
  confidence_score NUMERIC(3,2),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vulnerabilities table
CREATE TABLE IF NOT EXISTS vulnerabilities (
  vulnerability_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vulnerability_name TEXT NOT NULL,
  description TEXT,
  source_doc TEXT,
  page_number INTEGER,
  confidence_score NUMERIC(3,2),
  severity_level TEXT CHECK (severity_level IN ('Low', 'Medium', 'High', 'Critical')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OFCs table
CREATE TABLE IF NOT EXISTS ofcs (
  ofc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ofc_text TEXT NOT NULL,
  technology_class TEXT,
  source_doc TEXT,
  effort_level TEXT,
  effectiveness TEXT,
  cost_band TEXT,
  time_to_implement TEXT,
  capability_gain TEXT,
  reference_sources TEXT,
  version TEXT DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question-Vulnerability mapping
CREATE TABLE IF NOT EXISTS question_vulnerability_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(question_id) ON DELETE CASCADE,
  vulnerability_id UUID REFERENCES vulnerabilities(vulnerability_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question-OFC mapping
CREATE TABLE IF NOT EXISTS question_ofc_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(question_id) ON DELETE CASCADE,
  ofc_id UUID REFERENCES ofcs(ofc_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default sectors
INSERT INTO sectors (sector_name, description) VALUES 
  ('General', 'General security questions'),
  ('Education (K-12)', 'K-12 education sector'),
  ('Energy', 'Energy sector'),
  ('Transportation', 'Transportation sector')
ON CONFLICT (sector_name) DO NOTHING;

-- Insert sample questions
INSERT INTO questions (question_text, sector_id, technology_class, source_doc) VALUES 
  ('Does the organization have a security awareness training program?', 1, 'General', 'Sample Document'),
  ('Are there regular security assessments conducted?', 1, 'General', 'Sample Document'),
  ('Is there a documented incident response plan?', 1, 'General', 'Sample Document')
ON CONFLICT DO NOTHING;

-- Insert sample vulnerabilities
INSERT INTO vulnerabilities (vulnerability_name, description, severity_level) VALUES 
  ('Insufficient Security Training', 'Lack of comprehensive security awareness training for staff', 'Medium'),
  ('No Security Assessments', 'Absence of regular security vulnerability assessments', 'High'),
  ('Missing Incident Response Plan', 'No documented incident response procedures', 'High')
ON CONFLICT DO NOTHING;

-- Insert sample OFCs
INSERT INTO ofcs (ofc_text, technology_class, effort_level, effectiveness) VALUES 
  ('Implement regular security awareness training for all employees', 'General', 'Medium', 'High'),
  ('Establish quarterly security assessment schedule', 'General', 'Medium', 'High'),
  ('Develop and maintain incident response plan', 'General', 'High', 'High')
ON CONFLICT DO NOTHING;
      `);
      return false;
    } else if (sectorsError) {
      console.error('❌ Error checking sectors table:', sectorsError);
      return false;
    } else {
      console.log('✅ Tables already exist');
      
      // Check if we have data
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('question_id, question_text')
        .limit(5);
      
      if (questionsError) {
        console.log('⚠️  Questions table not accessible:', questionsError.message);
      } else {
        console.log(`📊 Found ${questions.length} questions in database`);
        questions.forEach(q => {
          console.log(`   - ${q.question_text.substring(0, 50)}...`);
        });
      }
      
      return true;
    }
    
  } catch (err) {
    console.error('❌ Error setting up schema:', err.message);
    return false;
  }
}

setupMainSchema().catch(console.error);






