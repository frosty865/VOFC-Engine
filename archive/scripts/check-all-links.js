const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAllLinks() {
  console.log('Checking all vulnerability-OFC links...\n');

  try {
    // Get all links
    const { data: links, error: linksError } = await supabase
      .from('vulnerability_ofc_links')
      .select('*')
      .order('vulnerability_id');

    if (linksError) {
      console.error('Error fetching links:', linksError);
      return;
    }

    console.log(`Total links: ${links.length}`);
    
    // Group by vulnerability
    const linksByVuln = {};
    links.forEach(link => {
      if (!linksByVuln[link.vulnerability_id]) {
        linksByVuln[link.vulnerability_id] = [];
      }
      linksByVuln[link.vulnerability_id].push(link);
    });

    console.log('\nLinks by vulnerability:');
    Object.keys(linksByVuln).slice(0, 10).forEach(vulnId => {
      console.log(`${vulnId}: ${linksByVuln[vulnId].length} links`);
    });

    // Check if vuln_0002 has links
    if (linksByVuln['vuln_0002']) {
      console.log('\nvuln_0002 links:');
      console.log(JSON.stringify(linksByVuln['vuln_0002'], null, 2));
    } else {
      console.log('\nvuln_0002 has no links');
    }

  } catch (error) {
    console.error('Error checking all links:', error);
  }
}

checkAllLinks();
