const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  try {
    console.log('Checking database schema for approval process...\n');
    
    // Check submissions table
    console.log('=== SUBMISSIONS TABLE ===');
    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .select('*')
      .limit(1);
    
    if (subError) {
      console.log('❌ Error fetching submissions:', subError.message);
    } else {
      console.log('✅ Submissions table accessible');
      if (submissions.length > 0) {
        console.log('Sample submission structure:');
        console.log(JSON.stringify(submissions[0], null, 2));
      }
    }
    
    // Check vulnerabilities table
    console.log('\n=== VULNERABILITIES TABLE ===');
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('*')
      .limit(1);
    
    if (vulnError) {
      console.log('❌ Error fetching vulnerabilities:', vulnError.message);
    } else {
      console.log('✅ Vulnerabilities table accessible');
      if (vulnerabilities.length > 0) {
        console.log('Sample vulnerability structure:');
        console.log(JSON.stringify(vulnerabilities[0], null, 2));
      }
    }
    
    // Check options_for_consideration table
    console.log('\n=== OPTIONS_FOR_CONSIDERATION TABLE ===');
    const { data: ofcs, error: ofcError } = await supabase
      .from('options_for_consideration')
      .select('*')
      .limit(1);
    
    if (ofcError) {
      console.log('❌ Error fetching options_for_consideration:', ofcError.message);
    } else {
      console.log('✅ Options_for_consideration table accessible');
      if (ofcs.length > 0) {
        console.log('Sample OFC structure:');
        console.log(JSON.stringify(ofcs[0], null, 2));
      }
    }
    
    // Check if 'ofcs' table exists (old table name)
    console.log('\n=== OFCS TABLE (OLD NAME) ===');
    const { data: oldOfcs, error: oldOfcError } = await supabase
      .from('ofcs')
      .select('*')
      .limit(1);
    
    if (oldOfcError) {
      console.log('❌ OFCs table does not exist (expected):', oldOfcError.message);
    } else {
      console.log('⚠️  OFCs table still exists (old table name)');
    }
    
    // Check sectors and subsectors tables
    console.log('\n=== SECTORS TABLE ===');
    const { data: sectors, error: sectorError } = await supabase
      .from('sectors')
      .select('*')
      .limit(1);
    
    if (sectorError) {
      console.log('❌ Error fetching sectors:', sectorError.message);
    } else {
      console.log('✅ Sectors table accessible');
    }
    
    console.log('\n=== SUBSECTORS TABLE ===');
    const { data: subsectors, error: subsectorError } = await supabase
      .from('subsectors')
      .select('*')
      .limit(1);
    
    if (subsectorError) {
      console.log('❌ Error fetching subsectors:', subsectorError.message);
    } else {
      console.log('✅ Subsectors table accessible');
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

checkSchema();


