const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testOFCLinking() {
  console.log('Testing OFC linking...\n');

  try {
    // Get vulnerabilities
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('id, discipline, sector, vulnerability')
      .limit(3);

    if (vulnError) {
      console.error('Error fetching vulnerabilities:', vulnError);
      return;
    }

    // Get OFCs
    const { data: ofcs, error: ofcsError } = await supabase
      .from('options_for_consideration')
      .select('id, option_text, discipline, sector')
      .limit(5);

    if (ofcsError) {
      console.error('Error fetching OFCs:', ofcsError);
      return;
    }

    // Get links
    const { data: links, error: linksError } = await supabase
      .from('vulnerability_ofc_links')
      .select('*')
      .limit(10);

    if (linksError) {
      console.error('Error fetching links:', linksError);
      return;
    }

    console.log('Vulnerabilities:', vulnerabilities.length);
    console.log('OFCs:', ofcs.length);
    console.log('Links:', links.length);

    // Test the linking logic
    for (const vuln of vulnerabilities) {
      const vulnLinks = links.filter(link => link.vulnerability_id === vuln.id);
      console.log(`\nVulnerability ${vuln.id}:`);
      console.log(`  Links found: ${vulnLinks.length}`);
      
      if (vulnLinks.length > 0) {
        for (const link of vulnLinks) {
          const ofc = ofcs.find(o => o.id === link.ofc_id);
          console.log(`  Link to OFC ${link.ofc_id}: ${ofc ? 'FOUND' : 'NOT FOUND'}`);
          if (ofc) {
            console.log(`    OFC text: ${ofc.option_text.substring(0, 50)}...`);
          }
        }
      }
    }

  } catch (error) {
    console.error('Error testing OFC linking:', error);
  }
}

testOFCLinking();


