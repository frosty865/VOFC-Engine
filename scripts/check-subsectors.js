const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSubsectors() {
  console.log('Checking subsectors table...\n');

  try {
    const { data: subsectors, error } = await supabase
      .from('subsectors')
      .select('*');

    if (error) {
      console.error('Error fetching subsectors:', error);
    } else {
      console.log(`Subsectors count: ${subsectors.length}`);
      console.log('Subsectors data:', JSON.stringify(subsectors, null, 2));
    }

    // Also check sectors
    const { data: sectors, error: sectorsError } = await supabase
      .from('sectors')
      .select('*');

    if (sectorsError) {
      console.error('Error fetching sectors:', sectorsError);
    } else {
      console.log(`\nSectors count: ${sectors.length}`);
      console.log('Sectors data:', JSON.stringify(sectors, null, 2));
    }

  } catch (error) {
    console.error('Error checking subsectors:', error);
  }
}

checkSubsectors();


