require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseData() {
  console.log('🔍 Checking database data...\n');
  
  try {
    // Check vulnerabilities table
    console.log('📊 Checking vulnerabilities table...');
    const { data: vulns, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('*')
      .limit(5);
    
    if (vulnError) {
      console.log('   ❌ Error:', vulnError.message);
    } else {
      console.log(`   ✅ Found ${vulns?.length || 0} vulnerabilities`);
      if (vulns && vulns.length > 0) {
        console.log('   📝 Sample vulnerability:', {
          id: vulns[0].id,
          vulnerability: vulns[0].vulnerability?.substring(0, 100) + '...',
          discipline: vulns[0].discipline
        });
      }
    }
    
    // Check OFCs table
    console.log('\n📊 Checking options_for_consideration table...');
    const { data: ofcs, error: ofcError } = await supabase
      .from('options_for_consideration')
      .select('*')
      .limit(5);
    
    if (ofcError) {
      console.log('   ❌ Error:', ofcError.message);
    } else {
      console.log(`   ✅ Found ${ofcs?.length || 0} OFCs`);
      if (ofcs && ofcs.length > 0) {
        console.log('   📝 Sample OFC:', {
          id: ofcs[0].id,
          option_text: ofcs[0].option_text?.substring(0, 100) + '...',
          discipline: ofcs[0].discipline
        });
      }
    }
    
    // Check sources table
    console.log('\n📊 Checking sources table...');
    const { data: sources, error: sourceError } = await supabase
      .from('sources')
      .select('*')
      .limit(5);
    
    if (sourceError) {
      console.log('   ❌ Error:', sourceError.message);
    } else {
      console.log(`   ✅ Found ${sources?.length || 0} sources`);
      if (sources && sources.length > 0) {
        console.log('   📝 Sample source:', {
          id: sources[0].id,
          reference_number: sources[0]['reference number'],
          source_text: sources[0].source_text?.substring(0, 100) + '...'
        });
      }
    }
    
    // Check vulnerability_ofc_links table
    console.log('\n📊 Checking vulnerability_ofc_links table...');
    const { data: links, error: linkError } = await supabase
      .from('vulnerability_ofc_links')
      .select('*')
      .limit(5);
    
    if (linkError) {
      console.log('   ❌ Error:', linkError.message);
    } else {
      console.log(`   ✅ Found ${links?.length || 0} vulnerability-OFC links`);
      if (links && links.length > 0) {
        console.log('   📝 Sample link:', links[0]);
      }
    }
    
    // Check ofc_sources table
    console.log('\n📊 Checking ofc_sources table...');
    const { data: ofcSources, error: ofcSourceError } = await supabase
      .from('ofc_sources')
      .select('*')
      .limit(5);
    
    if (ofcSourceError) {
      console.log('   ❌ Error:', ofcSourceError.message);
    } else {
      console.log(`   ✅ Found ${ofcSources?.length || 0} OFC-source links`);
      if (ofcSources && ofcSources.length > 0) {
        console.log('   📝 Sample link:', ofcSources[0]);
      }
    }
    
    console.log('\n🎯 Summary:');
    console.log(`   Vulnerabilities: ${vulns?.length || 0}`);
    console.log(`   OFCs: ${ofcs?.length || 0}`);
    console.log(`   Sources: ${sources?.length || 0}`);
    console.log(`   Vulnerability-OFC Links: ${links?.length || 0}`);
    console.log(`   OFC-Source Links: ${ofcSources?.length || 0}`);
    
    if ((vulns?.length || 0) === 0) {
      console.log('\n⚠️  No vulnerabilities found! This is why the dashboard is empty.');
      console.log('   The dashboard needs vulnerabilities to display data.');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkDatabaseData();
