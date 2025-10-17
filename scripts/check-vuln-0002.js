const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkVuln0002() {
  console.log('Checking if vuln_0002 exists in vulnerabilities table...\n');

  try {
    // Check if vuln_0002 exists
    const { data: vuln, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('*')
      .eq('id', 'vuln_0002')
      .single();

    if (vulnError) {
      console.error('Error fetching vuln_0002:', vulnError);
    } else {
      console.log('vuln_0002 found:');
      console.log(JSON.stringify(vuln, null, 2));
    }

    // Also check what vulnerabilities exist
    const { data: allVulns, error: allVulnsError } = await supabase
      .from('vulnerabilities')
      .select('id, discipline, sector')
      .limit(10);

    if (allVulnsError) {
      console.error('Error fetching all vulnerabilities:', allVulnsError);
    } else {
      console.log('\nFirst 10 vulnerabilities:');
      console.log(JSON.stringify(allVulns, null, 2));
    }

  } catch (error) {
    console.error('Error checking vuln_0002:', error);
  }
}

checkVuln0002();


