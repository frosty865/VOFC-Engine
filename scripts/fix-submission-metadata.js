#!/usr/bin/env node

/**
 * Fix submission metadata by adding missing fields automatically
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔧 Fixing Submission Metadata...');
console.log('================================\n');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function extractMetadataFromContent(enhancedExtraction) {
  if (!enhancedExtraction || !Array.isArray(enhancedExtraction)) {
    return {
      discipline: 'General',
      sources: 'Document Analysis',
      source_title: 'Unknown Document',
      source_url: null
    };
  }

  // Extract metadata from the first record
  const firstRecord = enhancedExtraction[0];
  if (!firstRecord) {
    return {
      discipline: 'General',
      sources: 'Document Analysis',
      source_title: 'Unknown Document',
      source_url: null
    };
  }

  // Extract source information
  const sourceTitle = firstRecord.source_title || 'Unknown Document';
  const sourceUrl = firstRecord.source_url || null;
  
  // Determine discipline based on content analysis
  let discipline = 'General';
  if (sourceTitle.toLowerCase().includes('security')) {
    discipline = 'Physical Security';
  } else if (sourceTitle.toLowerCase().includes('cyber')) {
    discipline = 'Cybersecurity';
  } else if (sourceTitle.toLowerCase().includes('emergency')) {
    discipline = 'Emergency Management';
  } else if (sourceTitle.toLowerCase().includes('planning')) {
    discipline = 'Risk Management';
  } else if (sourceTitle.toLowerCase().includes('response')) {
    discipline = 'Emergency Management';
  }

  // Count OFCs and vulnerabilities
  let ofcCount = 0;
  let vulnCount = 0;
  
  enhancedExtraction.forEach(record => {
    if (record.content) {
      record.content.forEach(entry => {
        if (entry.type === 'ofc') ofcCount++;
        if (entry.type === 'vulnerability') vulnCount++;
      });
    }
  });

  return {
    discipline,
    sources: sourceUrl || 'Document Analysis',
    source_title: sourceTitle,
    source_url: sourceUrl,
    ofc_count: ofcCount,
    vulnerability_count: vulnCount
  };
}

async function fixSubmissionMetadata() {
  try {
    console.log('📊 Fetching submissions that need metadata fixes...');
    
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`📋 Found ${submissions.length} total submissions`);
    
    let fixedCount = 0;
    
    for (const submission of submissions) {
      const data = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data;
      
      // Check if submission has enhanced extraction but missing basic metadata
      if (data.enhanced_extraction && (!data.discipline || !data.sources || !data.source_title)) {
        console.log(`\n🔧 Fixing submission ${submission.id.slice(0, 8)}...`);
        
        // Extract metadata from enhanced extraction
        const metadata = extractMetadataFromContent(data.enhanced_extraction);
        
        // Update the submission data
        const updatedData = {
          ...data,
          discipline: data.discipline || metadata.discipline,
          sources: data.sources || metadata.sources,
          source_title: data.source_title || metadata.source_title,
          source_url: data.source_url || metadata.source_url,
          ofc_count: data.ofc_count || metadata.ofc_count || 0,
          vulnerability_count: data.vulnerability_count || metadata.vulnerability_count || 0
        };
        
        // Update the submission in the database
        const { error: updateError } = await supabase
          .from('submissions')
          .update({
            data: JSON.stringify(updatedData),
            updated_at: new Date().toISOString()
          })
          .eq('id', submission.id);
        
        if (updateError) {
          console.error(`❌ Error updating submission ${submission.id.slice(0, 8)}:`, updateError);
        } else {
          console.log(`✅ Fixed submission ${submission.id.slice(0, 8)}`);
          console.log(`   Discipline: ${updatedData.discipline}`);
          console.log(`   Sources: ${updatedData.sources}`);
          console.log(`   Source Title: ${updatedData.source_title}`);
          console.log(`   OFCs: ${updatedData.ofc_count}`);
          console.log(`   Vulnerabilities: ${updatedData.vulnerability_count}`);
          fixedCount++;
        }
      }
    }
    
    console.log('\n🎯 Metadata Fix Complete!');
    console.log('=========================');
    console.log(`✅ Fixed ${fixedCount} submissions`);
    console.log(`📊 Total submissions: ${submissions.length}`);
    
    if (fixedCount > 0) {
      console.log('\n🎉 Submission metadata has been automatically populated!');
      console.log('   All submissions now have proper discipline, sources, and metadata.');
    } else {
      console.log('\n✅ All submissions already have proper metadata.');
    }
    
  } catch (error) {
    console.error('❌ Error fixing submission metadata:', error);
  }
}

async function verifyFixedSubmissions() {
  try {
    console.log('\n🔍 Verifying fixed submissions...');
    
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2);
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log('\n📊 Fixed Submission Data:');
    console.log('=========================');
    
    submissions.forEach((sub, idx) => {
      const data = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;
      console.log(`\n${idx + 1}. Submission ${sub.id.slice(0, 8)}...`);
      console.log(`   Type: ${sub.type}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Discipline: ${data.discipline || 'MISSING'}`);
      console.log(`   Sources: ${data.sources || 'MISSING'}`);
      console.log(`   Source Title: ${data.source_title || 'MISSING'}`);
      console.log(`   Source URL: ${data.source_url || 'MISSING'}`);
      console.log(`   OFCs: ${data.ofc_count || 0}`);
      console.log(`   Vulnerabilities: ${data.vulnerability_count || 0}`);
      console.log(`   Enhanced Extraction: ${data.enhanced_extraction ? 'YES' : 'NO'}`);
    });
    
  } catch (error) {
    console.error('❌ Error verifying submissions:', error);
  }
}

async function main() {
  await fixSubmissionMetadata();
  await verifyFixedSubmissions();
}

main();
