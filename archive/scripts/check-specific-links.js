const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSpecificLinks() {
  console.log('Checking specific vulnerability-OFC links...\n');

  try {
    // Check vuln_0002 which has a link
    const { data: links, error: linksError } = await supabase
      .from('vulnerability_ofc_links')
      .select('*')
      .eq('vulnerability_id', 'vuln_0002');

    if (linksError) {
      console.error('Error fetching links:', linksError);
      return;
    }

    console.log('Links for vuln_0002:');
    console.log(JSON.stringify(links, null, 2));

    // Now get the actual OFC data for ofc_0004
    const { data: ofc, error: ofcError } = await supabase
      .from('options_for_consideration')
      .select('*')
      .eq('id', 'ofc_0004')
      .single();

    if (ofcError) {
      console.error('Error fetching OFC ofc_0004:', ofcError);
    } else {
      console.log('\nOFC ofc_0004 data:');
      console.log(JSON.stringify(ofc, null, 2));
    }

  } catch (error) {
    console.error('Error checking specific links:', error);
  }
}

checkSpecificLinks();


