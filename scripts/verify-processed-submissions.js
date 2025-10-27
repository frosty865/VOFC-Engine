#!/usr/bin/env node

/**
 * Verify that submissions have been processed with the enhanced parser
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Verifying processed submissions...');
console.log('=====================================\n');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyProcessedSubmissions() {
  try {
    console.log('📊 Fetching submissions from database...');
    
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`📋 Found ${submissions.length} total submissions\n`);
    
    let processedCount = 0;
    let unprocessedCount = 0;
    
    console.log('📊 Processed Submissions Summary:');
    console.log('================================');
    
    submissions.forEach((sub, idx) => {
      const data = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;
      console.log(`${idx + 1}. ${sub.type} | ${sub.status} | ${data.source_title || 'Unknown'}`);
      
      if (data.enhanced_extraction) {
        processedCount++;
        console.log(`   ✅ Enhanced parsing completed`);
        console.log(`   📊 Total blocks: ${data.extraction_stats?.total_blocks || 0}`);
        console.log(`   📊 OFCs found: ${data.extraction_stats?.ofc_count || 0}`);
        console.log(`   📊 Vulnerabilities found: ${data.extraction_stats?.vulnerability_count || 0}`);
        console.log(`   🕒 Parsed at: ${data.parsed_at}`);
        console.log(`   🔧 Parser version: ${data.parser_version}`);
        
        // Show sample extracted content
        if (data.enhanced_extraction && data.enhanced_extraction.length > 0) {
          const firstRecord = data.enhanced_extraction[0];
          if (firstRecord.content && firstRecord.content.length > 0) {
            const sampleEntry = firstRecord.content[0];
            console.log(`   📝 Sample entry: ${sampleEntry.text.substring(0, 100)}...`);
            console.log(`   🏷️ Entry type: ${sampleEntry.type} (confidence: ${sampleEntry.confidence})`);
          }
        }
      } else {
        unprocessedCount++;
        console.log(`   ⚠️ Not yet processed with enhanced parser`);
      }
      console.log('');
    });
    
    console.log('🎯 Summary:');
    console.log('===========');
    console.log(`✅ Processed with enhanced parser: ${processedCount}`);
    console.log(`⚠️ Not yet processed: ${unprocessedCount}`);
    console.log(`📊 Total submissions: ${submissions.length}`);
    
    if (processedCount > 0) {
      console.log('\n🎉 Enhanced parsing is working!');
      console.log('   The submissions now contain structured content extracted by the enhanced parser.');
      console.log('   You can review the detailed results in the admin panel.');
    }
    
    if (unprocessedCount > 0) {
      console.log('\n⚠️ Some submissions still need processing.');
      console.log('   Run: node scripts/process-all-submissions.js');
    }
    
  } catch (error) {
    console.error('❌ Error verifying submissions:', error);
  }
}

verifyProcessedSubmissions();
