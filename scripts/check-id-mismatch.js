const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkIdMismatch() {
  console.log('Checking ID mismatch between vulnerabilities and links...\n');

  try {
    // Get all vulnerability IDs from vulnerabilities table
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('id')
      .order('id');

    if (vulnError) {
      console.error('Error fetching vulnerabilities:', vulnError);
      return;
    }

    // Get all vulnerability IDs from links table
    const { data: links, error: linksError } = await supabase
      .from('vulnerability_ofc_links')
      .select('vulnerability_id')
      .order('vulnerability_id');

    if (linksError) {
      console.error('Error fetching links:', linksError);
      return;
    }

    const vulnIds = vulnerabilities.map(v => v.id);
    const linkVulnIds = [...new Set(links.map(l => l.vulnerability_id))];

    console.log(`Vulnerabilities table: ${vulnIds.length} IDs`);
    console.log(`Links table: ${linkVulnIds.length} unique vulnerability IDs`);
    
    console.log('\nFirst 10 vulnerability IDs from vulnerabilities table:');
    vulnIds.slice(0, 10).forEach(id => console.log(`  ${id}`));
    
    console.log('\nFirst 10 vulnerability IDs from links table:');
    linkVulnIds.slice(0, 10).forEach(id => console.log(`  ${id}`));

    // Find matching IDs
    const matchingIds = linkVulnIds.filter(linkId => vulnIds.includes(linkId));
    console.log(`\nMatching IDs: ${matchingIds.length}`);
    console.log('Matching IDs:', matchingIds.slice(0, 10));

    // Find non-matching IDs
    const nonMatchingIds = linkVulnIds.filter(linkId => !vulnIds.includes(linkId));
    console.log(`\nNon-matching IDs: ${nonMatchingIds.length}`);
    console.log('Non-matching IDs:', nonMatchingIds.slice(0, 10));

  } catch (error) {
    console.error('Error checking ID mismatch:', error);
  }
}

checkIdMismatch();


