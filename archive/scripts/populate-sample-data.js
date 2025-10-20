#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function populateSampleData() {
  console.log('🌱 Populating database with sample data...\n');
  
  try {
    // Insert sectors
    console.log('1. Inserting sectors...');
    const { data: sectors, error: sectorsError } = await supabase
      .from('sectors')
      .insert([
        { sector_name: 'General', description: 'General security questions' },
        { sector_name: 'Education (K-12)', description: 'K-12 education sector' },
        { sector_name: 'Energy', description: 'Energy sector' },
        { sector_name: 'Transportation', description: 'Transportation sector' }
      ])
      .select();
    
    if (sectorsError) {
      console.log('⚠️  Sectors may already exist:', sectorsError.message);
    } else {
      console.log(`✅ Inserted ${sectors.length} sectors`);
    }
    
    // Insert sample questions
    console.log('\n2. Inserting sample questions...');
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .insert([
        {
          question_text: 'Does the organization have a security awareness training program?',
          sector_id: 1,
          technology_class: 'General',
          source_doc: 'Sample Document',
          page_number: 1,
          confidence_score: 0.85,
          display_order: 1
        },
        {
          question_text: 'Are there regular security assessments conducted?',
          sector_id: 1,
          technology_class: 'General',
          source_doc: 'Sample Document',
          page_number: 1,
          confidence_score: 0.80,
          display_order: 2
        },
        {
          question_text: 'Is there a documented incident response plan?',
          sector_id: 1,
          technology_class: 'General',
          source_doc: 'Sample Document',
          page_number: 1,
          confidence_score: 0.90,
          display_order: 3
        },
        {
          question_text: 'Do you have physical security measures in place?',
          sector_id: 1,
          technology_class: 'Physical Security',
          source_doc: 'Sample Document',
          page_number: 2,
          confidence_score: 0.75,
          display_order: 4
        }
      ])
      .select();
    
    if (questionsError) {
      console.log('⚠️  Questions may already exist:', questionsError.message);
    } else {
      console.log(`✅ Inserted ${questions.length} questions`);
    }
    
    // Insert sample vulnerabilities
    console.log('\n3. Inserting sample vulnerabilities...');
    const { data: vulnerabilities, error: vulnerabilitiesError } = await supabase
      .from('vulnerabilities')
      .insert([
        {
          vulnerability_name: 'Insufficient Security Training',
          description: 'Lack of comprehensive security awareness training for staff',
          severity_level: 'Medium',
          source_doc: 'Sample Document',
          page_number: 1,
          confidence_score: 0.85
        },
        {
          vulnerability_name: 'No Security Assessments',
          description: 'Absence of regular security vulnerability assessments',
          severity_level: 'High',
          source_doc: 'Sample Document',
          page_number: 1,
          confidence_score: 0.80
        },
        {
          vulnerability_name: 'Missing Incident Response Plan',
          description: 'No documented incident response procedures',
          severity_level: 'High',
          source_doc: 'Sample Document',
          page_number: 1,
          confidence_score: 0.90
        }
      ])
      .select();
    
    if (vulnerabilitiesError) {
      console.log('⚠️  Vulnerabilities may already exist:', vulnerabilitiesError.message);
    } else {
      console.log(`✅ Inserted ${vulnerabilities.length} vulnerabilities`);
    }
    
    // Insert sample OFCs
    console.log('\n4. Inserting sample OFCs...');
    const { data: ofcs, error: ofcsError } = await supabase
      .from('ofcs')
      .insert([
        {
          ofc_text: 'Implement regular security awareness training for all employees',
          technology_class: 'General',
          source_doc: 'Sample Document',
          effort_level: 'Medium',
          effectiveness: 'High',
          cost_band: 'Low',
          time_to_implement: '1-3 months',
          capability_gain: 'Improved security awareness',
          reference_sources: 'NIST Cybersecurity Framework'
        },
        {
          ofc_text: 'Establish quarterly security assessment schedule',
          technology_class: 'General',
          source_doc: 'Sample Document',
          effort_level: 'Medium',
          effectiveness: 'High',
          cost_band: 'Medium',
          time_to_implement: '3-6 months',
          capability_gain: 'Regular security monitoring',
          reference_sources: 'ISO 27001'
        },
        {
          ofc_text: 'Develop and maintain incident response plan',
          technology_class: 'General',
          source_doc: 'Sample Document',
          effort_level: 'High',
          effectiveness: 'High',
          cost_band: 'Medium',
          time_to_implement: '6-12 months',
          capability_gain: 'Improved incident response',
          reference_sources: 'NIST SP 800-61'
        }
      ])
      .select();
    
    if (ofcsError) {
      console.log('⚠️  OFCs may already exist:', ofcsError.message);
    } else {
      console.log(`✅ Inserted ${ofcs.length} OFCs`);
    }
    
    console.log('\n🎉 Sample data population completed!');
    
    // Verify the data was inserted
    console.log('\n📊 Verifying inserted data:');
    const { data: questionCount } = await supabase
      .from('questions')
      .select('*', { head: true, count: 'exact' });
    console.log(`   Questions: ${questionCount?.length || 0}`);
    
    const { data: vulnerabilityCount } = await supabase
      .from('vulnerabilities')
      .select('*', { head: true, count: 'exact' });
    console.log(`   Vulnerabilities: ${vulnerabilityCount?.length || 0}`);
    
    const { data: ofcCount } = await supabase
      .from('ofcs')
      .select('*', { head: true, count: 'exact' });
    console.log(`   OFCs: ${ofcCount?.length || 0}`);
    
  } catch (err) {
    console.error('❌ Error populating sample data:', err.message);
  }
}

populateSampleData().catch(console.error);






