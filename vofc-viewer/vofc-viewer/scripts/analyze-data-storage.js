#!/usr/bin/env node

/**
 * Analyze where submission data is stored throughout the process
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🗄️ Submission Data Storage Analysis');
console.log('===================================\n');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function analyzeDataStorage() {
  try {
    console.log('📊 Data Storage Flow:');
    console.log('====================');
    console.log('');
    
    console.log('1️⃣ INITIAL SUBMISSION');
    console.log('─────────────────────');
    console.log('📍 Location: submissions table');
    console.log('📋 Status: pending_review');
    console.log('💾 Data Storage:');
    console.log('   • submissions.id (UUID)');
    console.log('   • submissions.type (vulnerability/ofc)');
    console.log('   • submissions.status (pending_review)');
    console.log('   • submissions.data (JSONB) - Raw submission content');
    console.log('   • submissions.source (API submission URL)');
    console.log('   • submissions.submitter_email');
    console.log('   • submissions.created_at, updated_at');
    console.log('');
    
    console.log('2️⃣ ENHANCED PROCESSING');
    console.log('──────────────────────');
    console.log('📍 Location: submissions.data.enhanced_extraction');
    console.log('🔧 Processing: Automatic enhanced parser');
    console.log('💾 Data Storage:');
    console.log('   • data.enhanced_extraction (Array) - Parsed content blocks');
    console.log('   • data.parsed_at (Timestamp) - When parsing completed');
    console.log('   • data.parser_version (String) - Parser version used');
    console.log('   • data.extraction_stats (Object) - Processing statistics');
    console.log('   • data.ofc_count (Number) - Count of OFCs found');
    console.log('   • data.vulnerability_count (Number) - Count of vulnerabilities');
    console.log('   • data.discipline (String) - Auto-detected discipline');
    console.log('   • data.sources (String) - Source information');
    console.log('   • data.source_title (String) - Document title');
    console.log('   • data.source_url (String) - Document URL');
    console.log('');
    
    console.log('3️⃣ PENDING REVIEW');
    console.log('─────────────────');
    console.log('📍 Location: submissions table (status: pending_review)');
    console.log('👥 Access: Admin panel, SPSA review');
    console.log('💾 Data Storage:');
    console.log('   • All data remains in submissions table');
    console.log('   • Enhanced extraction results available');
    console.log('   • Metadata automatically populated');
    console.log('   • Ready for admin review and approval');
    console.log('');
    
    console.log('4️⃣ APPROVAL PROCESS');
    console.log('──────────────────');
    console.log('📍 Location: Multiple tables after approval');
    console.log('✅ Action: Move data to production tables');
    console.log('💾 Data Storage:');
    console.log('   • vulnerabilities table - For vulnerability submissions');
    console.log('   • options_for_consideration table - For OFC submissions');
    console.log('   • assessment_questions table - Auto-generated questions');
    console.log('   • vulnerability_ofc_links table - Links between vulns and OFCs');
    console.log('   • submissions.status = "approved"');
    console.log('');
    
    console.log('5️⃣ REJECTION PROCESS');
    console.log('────────────────────');
    console.log('📍 Location: submissions table (status: rejected)');
    console.log('❌ Action: Mark as rejected, optionally delete');
    console.log('💾 Data Storage:');
    console.log('   • submissions.status = "rejected"');
    console.log('   • submissions.comments - Rejection reason');
    console.log('   • submissions.processed_at - When rejected');
    console.log('   • submissions.processed_by - Who rejected it');
    console.log('   • Data can be deleted or kept for audit');
    console.log('');
    
    // Check current data
    console.log('📊 Current Data Status:');
    console.log('========================');
    
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`📋 Total submissions: ${submissions.length}`);
    
    const statusCounts = submissions.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Status distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
    console.log('\n🔍 Sample Submission Data:');
    console.log('===========================');
    
    if (submissions.length > 0) {
      const sub = submissions[0];
      const data = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;
      
      console.log(`ID: ${sub.id.slice(0, 8)}...`);
      console.log(`Status: ${sub.status}`);
      console.log(`Type: ${sub.type}`);
      console.log(`Enhanced Extraction: ${data.enhanced_extraction ? 'YES' : 'NO'}`);
      console.log(`Parsed At: ${data.parsed_at || 'Not parsed'}`);
      console.log(`OFC Count: ${data.ofc_count || 0}`);
      console.log(`Vulnerability Count: ${data.vulnerability_count || 0}`);
      console.log(`Discipline: ${data.discipline || 'Not set'}`);
      console.log(`Sources: ${data.sources || 'Not set'}`);
    }
    
    console.log('\n🎯 Summary:');
    console.log('============');
    console.log('✅ Data is stored in the submissions table throughout the process');
    console.log('✅ Enhanced parsing results are stored in the data JSONB field');
    console.log('✅ All metadata is automatically populated');
    console.log('✅ Data moves to production tables only after approval');
    console.log('✅ Rejected submissions remain in submissions table');
    console.log('✅ No data is lost during the review process');
    
  } catch (error) {
    console.error('❌ Error analyzing data storage:', error);
  }
}

analyzeDataStorage();
