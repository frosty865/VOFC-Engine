const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSubsectorFormatting() {
  console.log('Checking subsector formatting in database...\n');

  try {
    const { data, error } = await supabase
      .from('subsectors')
      .select(`
        *,
        sectors (
          sector_name
        )
      `)
      .limit(20);

    if (error) {
      console.error('Error fetching subsectors:', error);
      return;
    }

    console.log(`Found ${data.length} subsectors:\n`);

    data.forEach((subsector, index) => {
      console.log(`${index + 1}. Subsector: "${subsector.subsector_name}"`);
      console.log(`   Sector: ${subsector.sectors?.sector_name || 'Unknown'}`);
      console.log(`   Description: "${subsector.description}"`);
      console.log(`   Raw name length: ${subsector.subsector_name?.length || 0}`);
      console.log(`   Raw description length: ${subsector.description?.length || 0}`);
      
      // Check for special characters
      const nameHasSpecialChars = /[^\w\s\-&]/.test(subsector.subsector_name || '');
      const descHasSpecialChars = /[^\w\s\-&.,]/.test(subsector.description || '');
      
      if (nameHasSpecialChars) {
        console.log(`   ⚠️  Name contains special characters`);
      }
      if (descHasSpecialChars) {
        console.log(`   ⚠️  Description contains special characters`);
      }
      
      console.log('---');
    });

  } catch (error) {
    console.error('Error checking subsector formatting:', error);
  }
}

checkSubsectorFormatting();


