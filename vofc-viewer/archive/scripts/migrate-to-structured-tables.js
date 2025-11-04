#!/usr/bin/env node

/**
 * Migrate existing submission data to structured submission tables
 * This script assumes the submission mirror tables have been created
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔄 Migrating to Structured Submission Tables...');
console.log('===============================================\n');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTablesExist() {
  try {
    console.log('🔍 Checking if submission mirror tables exist...');
    
    // Try to access each table
    const tables = [
      'submission_vulnerabilities',
      'submission_options_for_consideration', 
      'submission_sources',
      'submission_vulnerability_ofc_links',
      'submission_ofc_sources'
    ];
    
    let allTablesExist = true;
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table ${table} does not exist: ${error.message}`);
        allTablesExist = false;
      } else {
        console.log(`✅ Table ${table} exists`);
      }
    }
    
    return allTablesExist;
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    return false;
  }
}

async function migrateSubmissionData() {
  try {
    console.log('\n📦 Migrating existing submission data...');
    
    // Get all submissions with enhanced extraction
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*');
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`📊 Found ${submissions.length} total submissions`);
    
    // Filter submissions with enhanced extraction
    const submissionsWithExtraction = submissions.filter(submission => {
      const data = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data;
      return data.enhanced_extraction && Array.isArray(data.enhanced_extraction);
    });
    
    console.log(`📊 Found ${submissionsWithExtraction.length} submissions with enhanced extraction`);
    
    for (const submission of submissionsWithExtraction) {
      console.log(`\n🔄 Migrating submission ${submission.id.slice(0, 8)}...`);
      
      const data = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data;
      
      // Check if already migrated
      const { data: existingVuln, error: checkError } = await supabase
        .from('submission_vulnerabilities')
        .select('id')
        .eq('submission_id', submission.id)
        .limit(1);
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.log('⚠️ Error checking existing data:', checkError.message);
        continue;
      }
      
      if (existingVuln && existingVuln.length > 0) {
        console.log('✅ Already migrated, skipping...');
        continue;
      }
      
      // Process enhanced extraction data to create individual vulnerability records
      let vulnCount = 0;
      let ofcCount = 0;
      let sourceCount = 0;
      const vulnerabilityRecords = [];
      
      // First, collect all vulnerabilities from enhanced extraction
      for (const record of data.enhanced_extraction) {
        if (record.content && Array.isArray(record.content)) {
          for (const entry of record.content) {
            if (entry.type === 'vulnerability') {
              vulnerabilityRecords.push({
                submission_id: submission.id,
                vulnerability: entry.text,
                discipline: data.discipline || 'General',
                source: data.sources || data.source_url || 'Document Analysis',
                source_title: data.source_title || 'Unknown Document',
                source_url: data.source_url,
                ofc_count: 0, // Will be updated later
                vulnerability_count: 0, // Will be updated later
                enhanced_extraction: data.enhanced_extraction,
                parsed_at: data.parsed_at,
                parser_version: data.parser_version,
                extraction_stats: data.extraction_stats
              });
              vulnCount++;
            }
          }
        }
      }
      
      // If no vulnerabilities found in extraction, create a general one
      if (vulnerabilityRecords.length === 0) {
        vulnerabilityRecords.push({
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
        });
        vulnCount = 1;
      }
      
      // Create vulnerability records
      const { data: vulnData, error: vulnError } = await supabase
        .from('submission_vulnerabilities')
        .insert(vulnerabilityRecords)
        .select();
      
      if (vulnError) {
        console.error(`❌ Error creating submission vulnerabilities:`, vulnError);
        continue;
      }
      
      console.log(`✅ Created ${vulnData.length} submission vulnerabilities`);
      
      // Process enhanced extraction data for OFCs
      for (const record of data.enhanced_extraction) {
        if (record.content && Array.isArray(record.content)) {
          for (const entry of record.content) {
            if (entry.type === 'ofc') {
              // Link to the first vulnerability (or create without link if no vulnerabilities)
              const vulnerabilityId = vulnData && vulnData.length > 0 ? vulnData[0].id : null;
              
              // Create submission OFC
              const { data: ofcData, error: ofcError } = await supabase
                .from('submission_options_for_consideration')
                .insert([{
                  submission_id: submission.id,
                  option_text: entry.text,
                  discipline: data.discipline || 'General',
                  vulnerability_id: vulnerabilityId,
                  source: data.sources || data.source_url || 'Document Analysis',
                  source_title: data.source_title,
                  source_url: data.source_url,
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
  console.log('🚀 Starting structured tables migration...\n');
  
  // Step 1: Check if tables exist
  const tablesExist = await checkTablesExist();
  if (!tablesExist) {
    console.log('\n❌ Submission mirror tables do not exist!');
    console.log('📋 Please create them first using the Supabase dashboard:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Run the SQL from SUBMISSION_MIRROR_TABLES_GUIDE.md');
    console.log('   3. Then run this script again');
    return;
  }
  
  // Step 2: Migrate existing data
  await migrateSubmissionData();
  
  // Step 3: Verify migration
  await verifyMigration();
  
  console.log('\n🎯 Migration Complete!');
  console.log('=====================');
  console.log('✅ Submission data migrated to structured tables');
  console.log('✅ Data now stored in proper relational format');
  console.log('✅ Ready for enhanced review process');
  console.log('✅ Easy approval workflow available');
}

main();
