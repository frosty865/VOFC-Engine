const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLSPolicies() {
  console.log('Checking RLS policies on vulnerability_ofc_links...\n');

  try {
    // Test with anon key (client-side)
    console.log('Testing with anon key (client-side):');
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('vulnerability_ofc_links')
      .select('*')
      .limit(10);

    if (anonError) {
      console.error('Anon key error:', anonError);
    } else {
      console.log(`Anon key results: ${anonData.length} links`);
      console.log('First 5 anon key vulnerability IDs:', anonData.slice(0, 5).map(link => link.vulnerability_id));
    }

    // Test with service key (server-side)
    console.log('\nTesting with service key (server-side):');
    const { data: serviceData, error: serviceError } = await supabaseService
      .from('vulnerability_ofc_links')
      .select('*')
      .limit(10);

    if (serviceError) {
      console.error('Service key error:', serviceError);
    } else {
      console.log(`Service key results: ${serviceData.length} links`);
      console.log('First 5 service key vulnerability IDs:', serviceData.slice(0, 5).map(link => link.vulnerability_id));
    }

    // Check if vuln_0002 exists in both
    const anonVuln0002 = anonData?.filter(link => link.vulnerability_id === 'vuln_0002') || [];
    const serviceVuln0002 = serviceData?.filter(link => link.vulnerability_id === 'vuln_0002') || [];
    
    console.log(`\nvuln_0002 links with anon key: ${anonVuln0002.length}`);
    console.log(`vuln_0002 links with service key: ${serviceVuln0002.length}`);

  } catch (error) {
    console.error('Error checking RLS policies:', error);
  }
}

checkRLSPolicies();


