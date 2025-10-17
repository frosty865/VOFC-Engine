const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugSubsectors() {
  console.log('Debugging subsectors...\n');
  
  // Check subsectors table
  const { data: subsectors, error: subsError } = await supabase
    .from('subsectors')
    .select('*')
    .limit(5);
  
  if (subsError) {
    console.error('Subsectors error:', subsError);
    return;
  }
  
  console.log('Sample subsectors:');
  subsectors.forEach(s => {
    console.log(`ID: ${s.id}, Name: ${s.subsector_name}, Sector ID: ${s.sector_id}`);
  });
  
  // Check sectors table
  const { data: sectors, error: secError } = await supabase
    .from('sectors')
    .select('*')
    .limit(3);
  
  if (secError) {
    console.error('Sectors error:', secError);
    return;
  }
  
  console.log('\nSample sectors:');
  sectors.forEach(s => {
    console.log(`ID: ${s.id}, Name: ${s.sector_name}`);
  });
  
  // Test filtering
  if (sectors.length > 0) {
    const firstSectorId = sectors[0].id;
    console.log(`\nTesting filtering for sector ID ${firstSectorId}:`);
    
    const { data: filtered, error: filterError } = await supabase
      .from('subsectors')
      .select('*')
      .eq('sector_id', firstSectorId);
    
    if (filterError) {
      console.error('Filter error:', filterError);
    } else {
      console.log(`Found ${filtered.length} subsectors for sector ${firstSectorId}`);
      filtered.forEach(s => {
        console.log(`  - ${s.subsector_name}`);
      });
    }
  }
}

debugSubsectors();


