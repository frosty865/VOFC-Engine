const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkLinkVulnIds() {
  console.log('Checking vulnerability IDs in links table...\n');

  try {
    // Get unique vulnerability IDs from links
    const { data: links, error: linksError } = await supabase
      .from('vulnerability_ofc_links')
      .select('vulnerability_id')
      .order('vulnerability_id');

    if (linksError) {
      console.error('Error fetching links:', linksError);
      return;
    }

    // Get unique vulnerability IDs
    const uniqueVulnIds = [...new Set(links.map(link => link.vulnerability_id))];
    
    console.log(`Total unique vulnerability IDs in links: ${uniqueVulnIds.length}`);
    console.log('First 20 vulnerability IDs:');
    uniqueVulnIds.slice(0, 20).forEach(id => {
      console.log(`  ${id}`);
    });

    // Check if vuln_0002 is in the list
    if (uniqueVulnIds.includes('vuln_0002')) {
      console.log('\nvuln_0002 IS in the links table');
    } else {
      console.log('\nvuln_0002 is NOT in the links table');
    }

    // Check what the first few vulnerability IDs look like
    console.log('\nFirst 10 links:');
    const { data: firstLinks, error: firstLinksError } = await supabase
      .from('vulnerability_ofc_links')
      .select('vulnerability_id, ofc_id')
      .limit(10);

    if (!firstLinksError) {
      console.log(JSON.stringify(firstLinks, null, 2));
    }

  } catch (error) {
    console.error('Error checking link vulnerability IDs:', error);
  }
}

checkLinkVulnIds();


