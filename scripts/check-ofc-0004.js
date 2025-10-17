const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOFC0004() {
  console.log('Checking OFC ofc_0004...\n');

  try {
    // Check if ofc_0004 exists
    const { data: ofc, error: ofcError } = await supabase
      .from('options_for_consideration')
      .select('*')
      .eq('id', 'ofc_0004')
      .single();

    if (ofcError) {
      console.error('Error fetching ofc_0004:', ofcError);
    } else {
      console.log('ofc_0004 found:');
      console.log(JSON.stringify(ofc, null, 2));
    }

    // Also check what OFCs exist
    const { data: allOFCs, error: allOFCsError } = await supabase
      .from('options_for_consideration')
      .select('id, option_text')
      .limit(10);

    if (allOFCsError) {
      console.error('Error fetching all OFCs:', allOFCsError);
    } else {
      console.log('\nFirst 10 OFCs:');
      console.log(JSON.stringify(allOFCs, null, 2));
    }

  } catch (error) {
    console.error('Error checking ofc_0004:', error);
  }
}

checkOFC0004();


