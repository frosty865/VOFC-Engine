const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectOFCTable() {
  console.log('Inspecting options_for_consideration table...\n');

  try {
    // Get OFC data
    const { data: ofcs, error: ofcsError } = await supabase
      .from('options_for_consideration')
      .select('*')
      .limit(5);

    if (ofcsError) {
      console.error('Error fetching OFCs:', ofcsError);
      return;
    }

    console.log('OFC table data:');
    console.log(JSON.stringify(ofcs, null, 2));

  } catch (error) {
    console.error('Error inspecting OFC table:', error);
  }
}

inspectOFCTable();


