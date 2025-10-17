const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMissingVulns() {
  console.log('Checking if vuln_0017 and vuln_0018 exist in vulnerabilities table...\n');

  try {
    // Check if vuln_0017 exists
    const { data: vuln0017, error: vuln0017Error } = await supabase
      .from('vulnerabilities')
      .select('*')
      .eq('id', 'vuln_0017')
      .single();

    if (vuln0017Error) {
      console.log('vuln_0017 does NOT exist in vulnerabilities table');
    } else {
      console.log('vuln_0017 EXISTS in vulnerabilities table:');
      console.log(JSON.stringify(vuln0017, null, 2));
    }

    // Check if vuln_0018 exists
    const { data: vuln0018, error: vuln0018Error } = await supabase
      .from('vulnerabilities')
      .select('*')
      .eq('id', 'vuln_0018')
      .single();

    if (vuln0018Error) {
      console.log('vuln_0018 does NOT exist in vulnerabilities table');
    } else {
      console.log('vuln_0018 EXISTS in vulnerabilities table:');
      console.log(JSON.stringify(vuln0018, null, 2));
    }

    // Check what the highest vulnerability ID is
    const { data: highestVuln, error: highestVulnError } = await supabase
      .from('vulnerabilities')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    if (!highestVulnError && highestVuln.length > 0) {
      console.log(`\nHighest vulnerability ID: ${highestVuln[0].id}`);
    }

  } catch (error) {
    console.error('Error checking missing vulnerabilities:', error);
  }
}

checkMissingVulns();


