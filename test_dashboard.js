require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDashboardData() {
  console.log('🧪 Testing dashboard data loading...\n');
  
  try {
    // Test the fetchVulnerabilities function logic
    console.log('1️⃣ Fetching vulnerabilities...');
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('*')
      .order('created_at', { ascending: false });

    if (vulnError) {
      console.log('   ❌ Error fetching vulnerabilities:', vulnError.message);
      return;
    }

    console.log(`   ✅ Found ${vulnerabilities?.length || 0} vulnerabilities`);

    if ((vulnerabilities?.length || 0) === 0) {
      console.log('   ⚠️  No vulnerabilities found - dashboard will be empty');
      return;
    }

    // Test the vulnerability-OFC links
    console.log('\n2️⃣ Fetching vulnerability-OFC links...');
    const { data: links, error: linkError } = await supabase
      .from('vulnerability_ofc_links')
      .select('*');

    if (linkError) {
      console.log('   ❌ Error fetching links:', linkError.message);
    } else {
      console.log(`   ✅ Found ${links?.length || 0} links`);
    }

    // Test the OFCs
    console.log('\n3️⃣ Fetching OFCs...');
    const { data: ofcs, error: ofcError } = await supabase
      .from('options_for_consideration')
      .select('*');

    if (ofcError) {
      console.log('   ❌ Error fetching OFCs:', ofcError.message);
    } else {
      console.log(`   ✅ Found ${ofcs?.length || 0} OFCs`);
    }

    // Test the complete data structure
    console.log('\n4️⃣ Building complete data structure...');
    const vulnerabilitiesWithOFCs = vulnerabilities.map(vuln => {
      const vulnLinks = links.filter(link => link.vulnerability_id === vuln.id);
      
      const ofcsWithSources = vulnLinks.map(link => {
        const ofc = ofcs.find(o => o.id === link.ofc_id);
        if (!ofc) return null;
        
        return {
          ...ofc,
          sources: [] // Simplified for testing
        };
      }).filter(Boolean);

      return {
        ...vuln,
        ofcs: ofcsWithSources
      };
    });

    console.log(`   ✅ Built ${vulnerabilitiesWithOFCs.length} vulnerabilities with OFCs`);
    
    // Show sample data
    if (vulnerabilitiesWithOFCs.length > 0) {
      const sample = vulnerabilitiesWithOFCs[0];
      console.log('\n📝 Sample vulnerability data:');
      console.log(`   ID: ${sample.id}`);
      console.log(`   Vulnerability: ${sample.vulnerability?.substring(0, 100)}...`);
      console.log(`   Discipline: ${sample.discipline}`);
      console.log(`   OFCs: ${sample.ofcs?.length || 0}`);
      
      if (sample.ofcs && sample.ofcs.length > 0) {
        console.log(`   Sample OFC: ${sample.ofcs[0].option_text?.substring(0, 100)}...`);
      }
    }

    console.log('\n🎯 Dashboard should display data if user is authenticated!');
    
  } catch (error) {
    console.error('❌ Error testing dashboard data:', error);
  }
}

testDashboardData();
