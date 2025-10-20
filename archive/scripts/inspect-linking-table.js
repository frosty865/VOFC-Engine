const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectLinkingTable() {
  console.log('Inspecting vulnerability_ofc_links table...\n');

  try {
    // Get table structure
    const { data: links, error: linksError } = await supabase
      .from('vulnerability_ofc_links')
      .select('*')
      .limit(5);

    if (linksError) {
      console.error('Error fetching links:', linksError);
      return;
    }

    console.log('Links table data:');
    console.log(JSON.stringify(links, null, 2));

    // Also check if the table exists and get its structure
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'vulnerability_ofc_links' });

    if (!tableError && tableInfo) {
      console.log('\nTable structure:');
      console.log(JSON.stringify(tableInfo, null, 2));
    }

  } catch (error) {
    console.error('Error inspecting linking table:', error);
  }
}

inspectLinkingTable();


