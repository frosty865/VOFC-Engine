const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFetchLinks() {
  console.log('Testing fetchVulnerabilityOFCLinks function...\n');

  try {
    // Simulate the fetchVulnerabilityOFCLinks function
    const { data, error } = await supabase
      .from('vulnerability_ofc_links')
      .select('*');
    
    if (error) {
      console.error('Error fetching vulnerability-OFC links:', error);
      return;
    }
    
    console.log('Fetched vulnerability-OFC links count:', data?.length);
    if (data && data.length > 0) {
      console.log('First link sample:', JSON.stringify(data[0], null, 2));
    }
    
    // Check if we have links for vuln_0002
    const vuln0002Links = data.filter(link => link.vulnerability_id === 'vuln_0002');
    console.log(`\nLinks for vuln_0002: ${vuln0002Links.length}`);
    if (vuln0002Links.length > 0) {
      console.log('vuln_0002 links:', JSON.stringify(vuln0002Links, null, 2));
    }

  } catch (error) {
    console.error('Database connection failed for vulnerability-OFC links:', error);
  }
}

testFetchLinks();


