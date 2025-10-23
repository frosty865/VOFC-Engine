#!/usr/bin/env node

/**
 * Manually create submission mirror tables using Supabase client
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🏗️ Creating Submission Mirror Tables (Manual)...');
console.log('================================================\n');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createSubmissionTables() {
  try {
    console.log('📋 Creating submission mirror tables...');
    
    // Create submission_vulnerabilities table
    console.log('1️⃣ Creating submission_vulnerabilities table...');
    const { error: vulnError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS submission_vulnerabilities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
          vulnerability TEXT NOT NULL,
          discipline TEXT,
          source TEXT,
          source_title TEXT,
          source_url TEXT,
          ofc_count INTEGER DEFAULT 0,
          vulnerability_count INTEGER DEFAULT 0,
          enhanced_extraction JSONB,
          parsed_at TIMESTAMP WITH TIME ZONE,
          parser_version TEXT,
          extraction_stats JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (vulnError) {
      console.error('❌ Error creating submission_vulnerabilities:', vulnError);
    } else {
      console.log('✅ submission_vulnerabilities table created');
    }
    
    // Create submission_options_for_consideration table
    console.log('2️⃣ Creating submission_options_for_consideration table...');
    const { error: ofcError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS submission_options_for_consideration (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
          option_text TEXT NOT NULL,
          discipline TEXT,
          vulnerability_id UUID REFERENCES submission_vulnerabilities(id) ON DELETE CASCADE,
          source TEXT,
          source_title TEXT,
          source_url TEXT,
          confidence_score DECIMAL(3,2) DEFAULT 1.00,
          pattern_matched TEXT,
          context TEXT,
          citations JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (ofcError) {
      console.error('❌ Error creating submission_options_for_consideration:', ofcError);
    } else {
      console.log('✅ submission_options_for_consideration table created');
    }
    
    // Create submission_sources table
    console.log('3️⃣ Creating submission_sources table...');
    const { error: sourceError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS submission_sources (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
          source_text TEXT NOT NULL,
          reference_number TEXT,
          source_title TEXT,
          source_url TEXT,
          author_org TEXT,
          publication_year INTEGER,
          content_restriction TEXT DEFAULT 'public',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (sourceError) {
      console.error('❌ Error creating submission_sources:', sourceError);
    } else {
      console.log('✅ submission_sources table created');
    }
    
    // Create submission_vulnerability_ofc_links table
    console.log('4️⃣ Creating submission_vulnerability_ofc_links table...');
    const { error: linkError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS submission_vulnerability_ofc_links (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
          vulnerability_id UUID REFERENCES submission_vulnerabilities(id) ON DELETE CASCADE,
          ofc_id UUID REFERENCES submission_options_for_consideration(id) ON DELETE CASCADE,
          link_type TEXT DEFAULT 'direct',
          confidence_score DECIMAL(3,2) DEFAULT 1.00,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (linkError) {
      console.error('❌ Error creating submission_vulnerability_ofc_links:', linkError);
    } else {
      console.log('✅ submission_vulnerability_ofc_links table created');
    }
    
    // Create submission_ofc_sources table
    console.log('5️⃣ Creating submission_ofc_sources table...');
    const { error: ofcSourceError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS submission_ofc_sources (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
          ofc_id UUID REFERENCES submission_options_for_consideration(id) ON DELETE CASCADE,
          source_id UUID REFERENCES submission_sources(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (ofcSourceError) {
      console.error('❌ Error creating submission_ofc_sources:', ofcSourceError);
    } else {
      console.log('✅ submission_ofc_sources table created');
    }
    
    console.log('\n🎉 All submission mirror tables created successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    return false;
  }
}

async function createIndexes() {
  try {
    console.log('\n📊 Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_submission_id ON submission_vulnerabilities(submission_id);',
      'CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_discipline ON submission_vulnerabilities(discipline);',
      'CREATE INDEX IF NOT EXISTS idx_submission_ofcs_submission_id ON submission_options_for_consideration(submission_id);',
      'CREATE INDEX IF NOT EXISTS idx_submission_ofcs_discipline ON submission_options_for_consideration(discipline);',
      'CREATE INDEX IF NOT EXISTS idx_submission_sources_submission_id ON submission_sources(submission_id);'
    ];
    
    for (const indexSQL of indexes) {
      const { error } = await supabase.rpc('exec', { sql: indexSQL });
      if (error) {
        console.error(`❌ Error creating index: ${error.message}`);
      }
    }
    
    console.log('✅ Indexes created successfully');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
}

async function setupRLS() {
  try {
    console.log('\n🔒 Setting up Row Level Security...');
    
    const rlsPolicies = [
      'ALTER TABLE submission_vulnerabilities ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE submission_options_for_consideration ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE submission_sources ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE submission_vulnerability_ofc_links ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE submission_ofc_sources ENABLE ROW LEVEL SECURITY;',
      'CREATE POLICY "Allow service role full access" ON submission_vulnerabilities FOR ALL USING (auth.role() = \'service_role\');',
      'CREATE POLICY "Allow service role full access" ON submission_options_for_consideration FOR ALL USING (auth.role() = \'service_role\');',
      'CREATE POLICY "Allow service role full access" ON submission_sources FOR ALL USING (auth.role() = \'service_role\');',
      'CREATE POLICY "Allow service role full access" ON submission_vulnerability_ofc_links FOR ALL USING (auth.role() = \'service_role\');',
      'CREATE POLICY "Allow service role full access" ON submission_ofc_sources FOR ALL USING (auth.role() = \'service_role\');'
    ];
    
    for (const policySQL of rlsPolicies) {
      const { error } = await supabase.rpc('exec', { sql: policySQL });
      if (error) {
        console.error(`❌ Error setting up RLS: ${error.message}`);
      }
    }
    
    console.log('✅ RLS policies created successfully');
    
  } catch (error) {
    console.error('❌ Error setting up RLS:', error);
  }
}

async function main() {
  console.log('🚀 Starting manual submission tables setup...\n');
  
  // Step 1: Create tables
  const tablesCreated = await createSubmissionTables();
  if (!tablesCreated) {
    console.log('❌ Failed to create tables, stopping...');
    return;
  }
  
  // Step 2: Create indexes
  await createIndexes();
  
  // Step 3: Setup RLS
  await setupRLS();
  
  console.log('\n🎯 Setup Complete!');
  console.log('==================');
  console.log('✅ Submission mirror tables created');
  console.log('✅ Indexes created');
  console.log('✅ RLS policies set up');
  console.log('✅ Ready for structured data storage');
}

main();
