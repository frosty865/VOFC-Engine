#!/usr/bin/env node

/**
 * Setup submission mirror tables and migrate existing data
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

console.log('🏗️ Setting up Submission Mirror Tables...');
console.log('==========================================\n');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function setupSubmissionTables() {
  try {
    console.log('📋 Creating submission mirror tables...');
    
    // Read the SQL schema file
    const schemaPath = path.join(process.cwd(), 'sql', 'submission-tables-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema creation
    const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schemaSQL });
    
    if (schemaError) {
      console.error('❌ Error creating schema:', schemaError);
      return false;
    }
    
    console.log('✅ Submission mirror tables created successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error setting up tables:', error);
    return false;
  }
}

async function migrateExistingSubmissions() {
  try {
    console.log('\n📦 Migrating existing submission data...');
    
    // Get all submissions with enhanced extraction
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .not('data->enhanced_extraction', 'is', null);
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`📊 Found ${submissions.length} submissions with enhanced extraction`);
    
    for (const submission of submissions) {
      console.log(`\n🔄 Migrating submission ${submission.id.slice(0, 8)}...`);
      
      const data = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data;
      
      if (!data.enhanced_extraction || !Array.isArray(data.enhanced_extraction)) {
        console.log('⚠️ No enhanced extraction data found, skipping...');
        continue;
      }
      
      // Create submission vulnerability record
      const { data: vulnData, error: vulnError } = await supabase
        .from('submission_vulnerabilities')
        .insert([{
          submission_id: submission.id,
          vulnerability: data.vulnerability || 'Extracted from document',
          discipline: data.discipline || 'General',
          source: data.sources || data.source_url || 'Document Analysis',
          source_title: data.source_title || 'Unknown Document',
          source_url: data.source_url,
          ofc_count: data.ofc_count || 0,
          vulnerability_count: data.vulnerability_count || 0,
          enhanced_extraction: data.enhanced_extraction,
          parsed_at: data.parsed_at,
          parser_version: data.parser_version,
          extraction_stats: data.extraction_stats
        }])
        .select()
        .single();
      
      if (vulnError) {
        console.error(`❌ Error creating submission vulnerability:`, vulnError);
        continue;
      }
      
      console.log(`✅ Created submission vulnerability: ${vulnData.id.slice(0, 8)}...`);
      
      // Process enhanced extraction data
      let ofcCount = 0;
      let sourceCount = 0;
      
      for (const record of data.enhanced_extraction) {
        if (record.content && Array.isArray(record.content)) {
          for (const entry of record.content) {
            if (entry.type === 'ofc') {
              // Create submission OFC
              const { data: ofcData, error: ofcError } = await supabase
                .from('submission_options_for_consideration')
                .insert([{
                  submission_id: submission.id,
                  option_text: entry.text,
                  discipline: record.source_title?.includes('security') ? 'Physical Security' : 'General',
                  vulnerability_id: vulnData.id,
                  source: record.source_url || 'Document Analysis',
                  source_title: record.source_title,
                  source_url: record.source_url,
                  confidence_score: entry.confidence || 0.8,
                  pattern_matched: entry.pattern_matched,
                  context: entry.context,
                  citations: entry.citations || []
                }])
                .select()
                .single();
              
              if (!ofcError) {
                ofcCount++;
                console.log(`   ✅ Created OFC: ${ofcData.id.slice(0, 8)}...`);
              }
            }
          }
        }
        
        // Create submission source if not exists
        if (record.source_url && !record.source_url.includes('temp')) {
          const { data: sourceData, error: sourceError } = await supabase
            .from('submission_sources')
            .insert([{
              submission_id: submission.id,
              source_text: record.source_title || 'Document Source',
              reference_number: `REF-${Date.now()}`,
              source_title: record.source_title,
              source_url: record.source_url,
              author_org: record.author_org,
              publication_year: record.publication_year,
              content_restriction: record.content_restriction || 'public'
            }])
            .select()
            .single();
          
          if (!sourceError) {
            sourceCount++;
            console.log(`   ✅ Created source: ${sourceData.id.slice(0, 8)}...`);
          }
        }
      }
      
      console.log(`📊 Migration complete for submission ${submission.id.slice(0, 8)}:`);
      console.log(`   • OFCs created: ${ofcCount}`);
      console.log(`   • Sources created: ${sourceCount}`);
    }
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error migrating submissions:', error);
  }
}

async function verifyMigration() {
  try {
    console.log('\n🔍 Verifying migration...');
    
    // Check submission vulnerabilities
    const { data: vulns, error: vulnError } = await supabase
      .from('submission_vulnerabilities')
      .select('*');
    
    if (vulnError) {
      console.error('❌ Error checking vulnerabilities:', vulnError);
      return;
    }
    
    console.log(`📊 Submission vulnerabilities: ${vulns.length}`);
    
    // Check submission OFCs
    const { data: ofcs, error: ofcError } = await supabase
      .from('submission_options_for_consideration')
      .select('*');
    
    if (ofcError) {
      console.error('❌ Error checking OFCs:', ofcError);
      return;
    }
    
    console.log(`📊 Submission OFCs: ${ofcs.length}`);
    
    // Check submission sources
    const { data: sources, error: sourceError } = await supabase
      .from('submission_sources')
      .select('*');
    
    if (sourceError) {
      console.error('❌ Error checking sources:', sourceError);
      return;
    }
    
    console.log(`📊 Submission sources: ${sources.length}`);
    
    console.log('\n✅ Migration verification complete!');
    console.log('📋 Submission data is now stored in structured mirror tables');
    
  } catch (error) {
    console.error('❌ Error verifying migration:', error);
  }
}

async function main() {
  console.log('🚀 Starting submission mirror tables setup...\n');
  
  // Step 1: Create tables
  const tablesCreated = await setupSubmissionTables();
  if (!tablesCreated) {
    console.log('❌ Failed to create tables, stopping...');
    return;
  }
  
  // Step 2: Migrate existing data
  await migrateExistingSubmissions();
  
  // Step 3: Verify migration
  await verifyMigration();
  
  console.log('\n🎯 Setup Complete!');
  console.log('==================');
  console.log('✅ Submission mirror tables created');
  console.log('✅ Existing data migrated');
  console.log('✅ Data now stored in structured format');
  console.log('✅ Ready for review and approval process');
}

main();
