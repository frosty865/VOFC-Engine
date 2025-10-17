const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSpecialCharacters() {
  console.log('Checking for special characters in subsectors...\n');

  try {
    const { data, error } = await supabase
      .from('subsectors')
      .select('*')
      .limit(50);

    if (error) {
      console.error('Error fetching subsectors:', error);
      return;
    }

    console.log(`Checking ${data.length} subsectors for special characters:\n`);

    data.forEach((subsector, index) => {
      const name = subsector.subsector_name || '';
      const desc = subsector.description || '';
      
      // Check for HTML entities
      const htmlEntities = /&[a-zA-Z0-9#]+;/g;
      const nameEntities = name.match(htmlEntities);
      const descEntities = desc.match(htmlEntities);
      
      // Check for special characters
      const specialChars = /[^\w\s\-&.,()]/g;
      const nameSpecial = name.match(specialChars);
      const descSpecial = desc.match(specialChars);
      
      if (nameEntities || descEntities || nameSpecial || descSpecial) {
        console.log(`${index + 1}. "${name}"`);
        if (nameEntities) console.log(`   HTML entities in name: ${nameEntities.join(', ')}`);
        if (descEntities) console.log(`   HTML entities in description: ${descEntities.join(', ')}`);
        if (nameSpecial) console.log(`   Special chars in name: ${nameSpecial.join(', ')}`);
        if (descSpecial) console.log(`   Special chars in description: ${descSpecial.join(', ')}`);
        console.log('---');
      }
    });

    console.log('\nDone checking for special characters.');

  } catch (error) {
    console.error('Error checking special characters:', error);
  }
}

checkSpecialCharacters();


