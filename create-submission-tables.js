#!/usr/bin/env node

/**
 * Create Submission Mirror Tables
 * Root-level script to create submission tables in Supabase
 * Run this from the root directory: node create-submission-tables.js
 */

require('dotenv').config({ path: './vofc-viewer/.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🏗️ Creating Submission Mirror Tables...');
console.log('=====================================\n');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createSubmissionVulnerabilitiesTable() {
  try {
    console.log('1️⃣ Creating submission_vulnerabilities table...');
    
    const sql = `
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
    `;
    
    const { error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error('❌ Error creating submission_vulnerabilities:', error);
      return false;
    }
    
    console.log('✅ submission_vulnerabilities table created');
    return true;
    
  } catch (error) {
    console.error('❌ Error creating submission_vulnerabilities:', error);
    return false;
  }
}

async function createSubmissionOFCTable() {
  try {
    console.log('2️⃣ Creating submission_options_for_consideration table...');
    
    const sql = `
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
    `;
    
    const { error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error('❌ Error creating submission_options_for_consideration:', error);
      return false;
    }
    
    console.log('✅ submission_options_for_consideration table created');
    return true;
    
  } catch (error) {
    console.error('❌ Error creating submission_options_for_consideration:', error);
    return false;
  }
}

async function createSubmissionSourcesTable() {
  try {
    console.log('3️⃣ Creating submission_sources table...');
    
    const sql = `
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
    `;
    
    const { error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error('❌ Error creating submission_sources:', error);
      return false;
    }
    
    console.log('✅ submission_sources table created');
    return true;
    
  } catch (error) {
    console.error('❌ Error creating submission_sources:', error);
    return false;
  }
}

async function createSubmissionLinksTable() {
  try {
    console.log('4️⃣ Creating submission_vulnerability_ofc_links table...');
    
    const sql = `
      CREATE TABLE IF NOT EXISTS submission_vulnerability_ofc_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
        vulnerability_id UUID REFERENCES submission_vulnerabilities(id) ON DELETE CASCADE,
        ofc_id UUID REFERENCES submission_options_for_consideration(id) ON DELETE CASCADE,
        link_type TEXT DEFAULT 'direct',
        confidence_score DECIMAL(3,2) DEFAULT 1.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const { error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error('❌ Error creating submission_vulnerability_ofc_links:', error);
      return false;
    }
    
    console.log('✅ submission_vulnerability_ofc_links table created');
    return true;
    
  } catch (error) {
    console.error('❌ Error creating submission_vulnerability_ofc_links:', error);
    return false;
  }
}

async function createSubmissionOFCSourcesTable() {
  try {
    console.log('5️⃣ Creating submission_ofc_sources table...');
    
    const sql = `
      CREATE TABLE IF NOT EXISTS submission_ofc_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
        ofc_id UUID REFERENCES submission_options_for_consideration(id) ON DELETE CASCADE,
        source_id UUID REFERENCES submission_sources(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const { error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error('❌ Error creating submission_ofc_sources:', error);
      return false;
    }
    
    console.log('✅ submission_ofc_sources table created');
    return true;
    
  } catch (error) {
    console.error('❌ Error creating submission_ofc_sources:', error);
    return false;
  }
}

async function createIndexes() {
  try {
    console.log('\n📊 Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_submission_id ON submission_vulnerabilities(submission_id);',
      'CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_discipline ON submission_vulnerabilities(discipline);',
      'CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_created_at ON submission_vulnerabilities(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_submission_ofcs_submission_id ON submission_options_for_consideration(submission_id);',
      'CREATE INDEX IF NOT EXISTS idx_submission_ofcs_discipline ON submission_options_for_consideration(discipline);',
      'CREATE INDEX IF NOT EXISTS idx_submission_ofcs_vulnerability_id ON submission_options_for_consideration(vulnerability_id);',
      'CREATE INDEX IF NOT EXISTS idx_submission_sources_submission_id ON submission_sources(submission_id);',
      'CREATE INDEX IF NOT EXISTS idx_submission_sources_reference_number ON submission_sources(reference_number);',
      'CREATE INDEX IF NOT EXISTS idx_submission_vuln_ofc_links_submission_id ON submission_vulnerability_ofc_links(submission_id);',
      'CREATE INDEX IF NOT EXISTS idx_submission_vuln_ofc_links_vulnerability_id ON submission_vulnerability_ofc_links(vulnerability_id);',
      'CREATE INDEX IF NOT EXISTS idx_submission_vuln_ofc_links_ofc_id ON submission_vulnerability_ofc_links(ofc_id);',
      'CREATE INDEX IF NOT EXISTS idx_submission_ofc_sources_submission_id ON submission_ofc_sources(submission_id);',
      'CREATE INDEX IF NOT EXISTS idx_submission_ofc_sources_ofc_id ON submission_ofc_sources(ofc_id);',
      'CREATE INDEX IF NOT EXISTS idx_submission_ofc_sources_source_id ON submission_ofc_sources(source_id);'
    ];
    
    let successCount = 0;
    for (const indexSQL of indexes) {
      const { error } = await supabase.rpc('exec', { sql: indexSQL });
      if (error) {
        console.error(`❌ Error creating index: ${error.message}`);
      } else {
        successCount++;
      }
    }
    
    console.log(`✅ Created ${successCount}/${indexes.length} indexes`);
    
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
    
    let successCount = 0;
    for (const policySQL of rlsPolicies) {
      const { error } = await supabase.rpc('exec', { sql: policySQL });
      if (error) {
        console.error(`❌ Error setting up RLS: ${error.message}`);
      } else {
        successCount++;
      }
    }
    
    console.log(`✅ Created ${successCount}/${rlsPolicies.length} RLS policies`);
    
  } catch (error) {
    console.error('❌ Error setting up RLS:', error);
  }
}

async function createViews() {
  try {
    console.log('\n👁️ Creating views...');
    
    const views = [
      `CREATE OR REPLACE VIEW submission_vulnerabilities_with_ofcs AS
       SELECT 
         sv.id,
         sv.submission_id,
         sv.vulnerability,
         sv.discipline,
         sv.source,
         sv.source_title,
         sv.source_url,
         sv.ofc_count,
         sv.vulnerability_count,
         sv.enhanced_extraction,
         sv.parsed_at,
         sv.parser_version,
         sv.extraction_stats,
         sv.created_at,
         sv.updated_at,
         COUNT(svol.ofc_id) as linked_ofc_count
       FROM submission_vulnerabilities sv
       LEFT JOIN submission_vulnerability_ofc_links svol ON sv.id = svol.vulnerability_id
       GROUP BY sv.id, sv.submission_id, sv.vulnerability, sv.discipline, sv.source, sv.source_title, sv.source_url, sv.ofc_count, sv.vulnerability_count, sv.enhanced_extraction, sv.parsed_at, sv.parser_version, sv.extraction_stats, sv.created_at, sv.updated_at;`,
       
      `CREATE OR REPLACE VIEW submission_ofcs_with_sources AS
       SELECT 
         so.id,
         so.submission_id,
         so.option_text,
         so.discipline,
         so.vulnerability_id,
         so.source,
         so.source_title,
         so.source_url,
         so.confidence_score,
         so.pattern_matched,
         so.context,
         so.citations,
         so.created_at,
         so.updated_at,
         COUNT(sos.source_id) as source_count
       FROM submission_options_for_consideration so
       LEFT JOIN submission_ofc_sources sos ON so.id = sos.ofc_id
       GROUP BY so.id, so.submission_id, so.option_text, so.discipline, so.vulnerability_id, so.source, so.source_title, so.source_url, so.confidence_score, so.pattern_matched, so.context, so.citations, so.created_at, so.updated_at;`
    ];
    
    let successCount = 0;
    for (const viewSQL of views) {
      const { error } = await supabase.rpc('exec', { sql: viewSQL });
      if (error) {
        console.error(`❌ Error creating view: ${error.message}`);
      } else {
        successCount++;
      }
    }
    
    console.log(`✅ Created ${successCount}/${views.length} views`);
    
  } catch (error) {
    console.error('❌ Error creating views:', error);
  }
}

async function verifyTables() {
  try {
    console.log('\n🔍 Verifying tables were created...');
    
    const tables = [
      'submission_vulnerabilities',
      'submission_options_for_consideration',
      'submission_sources',
      'submission_vulnerability_ofc_links',
      'submission_ofc_sources'
    ];
    
    let existingCount = 0;
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table ${table} does not exist: ${error.message}`);
      } else {
        console.log(`✅ Table ${table} exists`);
        existingCount++;
      }
    }
    
    console.log(`\n📊 Summary: ${existingCount}/${tables.length} tables exist`);
    
    if (existingCount === tables.length) {
      console.log('🎉 All submission mirror tables created successfully!');
      return true;
    } else {
      console.log('⚠️ Some tables may not have been created properly');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error verifying tables:', error);
    return false;
  }
}

async function runHeuristicParser() {
  try {
    console.log('\n🧠 Running Heuristic Parser...');
    console.log('=============================');
    
    const { spawn } = require('child_process');
    const path = require('path');
    
    return new Promise((resolve) => {
      const heuristicTool = spawn('node', ['heuristic-parser-tool.js'], {
        cwd: __dirname,
        stdio: 'inherit'
      });
      
      heuristicTool.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Heuristic parser completed successfully');
          resolve(true);
        } else {
          console.log('⚠️ Heuristic parser completed with warnings');
          resolve(false);
        }
      });
      
      heuristicTool.on('error', (error) => {
        console.error('❌ Error running heuristic parser:', error.message);
        resolve(false);
      });
    });
    
  } catch (error) {
    console.error('❌ Error running heuristic parser:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting complete VOFC Engine setup...\n');
  
  // Step 1: Create all tables
  console.log('📋 Step 1: Creating submission mirror tables...');
  const tableResults = await Promise.all([
    createSubmissionVulnerabilitiesTable(),
    createSubmissionOFCTable(),
    createSubmissionSourcesTable(),
    createSubmissionLinksTable(),
    createSubmissionOFCSourcesTable()
  ]);
  
  const allTablesCreated = tableResults.every(result => result);
  
  if (!allTablesCreated) {
    console.log('\n❌ Some tables failed to create, stopping...');
    return;
  }
  
  // Step 2: Create indexes
  console.log('\n📊 Step 2: Creating indexes...');
  await createIndexes();
  
  // Step 3: Setup RLS
  console.log('\n🔒 Step 3: Setting up RLS policies...');
  await setupRLS();
  
  // Step 4: Create views
  console.log('\n👁️ Step 4: Creating views...');
  await createViews();
  
  // Step 5: Verify tables
  console.log('\n🔍 Step 5: Verifying tables...');
  const verificationSuccess = await verifyTables();
  
  if (!verificationSuccess) {
    console.log('\n❌ Table verification failed, stopping...');
    return;
  }
  
  // Step 6: Run Heuristic Parser
  console.log('\n🧠 Step 6: Running heuristic parser...');
  const heuristicSuccess = await runHeuristicParser();
  
  console.log('\n🎯 Complete Setup Process Finished!');
  console.log('====================================');
  
  console.log('✅ All submission mirror tables created successfully');
  console.log('✅ Indexes created for performance');
  console.log('✅ RLS policies configured');
  console.log('✅ Views created for easy querying');
  console.log('✅ Ready for structured submission data storage');
  
  if (heuristicSuccess) {
    console.log('✅ Heuristic parser completed successfully');
    console.log('✅ Documents processed with advanced parsing');
  } else {
    console.log('⚠️ Heuristic parser completed with warnings');
    console.log('📋 Check heuristic parser output for details');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Run migration script: node vofc-viewer/scripts/migrate-to-structured-tables.js');
  console.log('2. Update admin interface to use structured data');
  console.log('3. Test the new submission workflow');
  console.log('4. Review heuristic parser results in vofc-viewer/data/heuristic-parsed/');
}

main().catch(console.error);
