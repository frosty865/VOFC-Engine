const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkActualLinks() {
  console.log('Checking actual links in database...\n');

  try {
    // Get all links without any ordering
    const { data: allLinks, error: allLinksError } = await supabase
      .from('vulnerability_ofc_links')
      .select('*');

    if (allLinksError) {
      console.error('Error fetching all links:', allLinksError);
      return;
    }

    console.log(`Total links: ${allLinks.length}`);

    // Get unique vulnerability IDs
    const uniqueVulnIds = [...new Set(allLinks.map(link => link.vulnerability_id))];
    console.log(`Unique vulnerability IDs: ${uniqueVulnIds.length}`);
    console.log('All unique vulnerability IDs:', uniqueVulnIds);

    // Check if vuln_0002 exists
    const vuln0002Links = allLinks.filter(link => link.vulnerability_id === 'vuln_0002');
    console.log(`\nvuln_0002 links: ${vuln0002Links.length}`);
    if (vuln0002Links.length > 0) {
      console.log('vuln_0002 links:', JSON.stringify(vuln0002Links, null, 2));
    }

    // Check the first 20 links
    console.log('\nFirst 20 links:');
    allLinks.slice(0, 20).forEach((link, index) => {
      console.log(`${index + 1}. ${link.vulnerability_id} -> ${link.ofc_id}`);
    });

  } catch (error) {
    console.error('Error checking actual links:', error);
  }
}

checkActualLinks();


