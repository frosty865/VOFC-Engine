const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNewSchema() {
  console.log('Checking new database schema...\n');

  try {
    // Check vulnerabilities table
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('*')
      .limit(3);

    if (vulnError) {
      console.error('Error fetching vulnerabilities:', vulnError);
    } else {
      console.log('Vulnerabilities table:');
      console.log(`Count: ${vulnerabilities.length}`);
      if (vulnerabilities.length > 0) {
        console.log('Sample vulnerability:', JSON.stringify(vulnerabilities[0], null, 2));
      }
    }

    // Check OFCs table
    const { data: ofcs, error: ofcsError } = await supabase
      .from('options_for_consideration')
      .select('*')
      .limit(3);

    if (ofcsError) {
      console.error('Error fetching OFCs:', ofcsError);
    } else {
      console.log('\nOFCs table:');
      console.log(`Count: ${ofcs.length}`);
      if (ofcs.length > 0) {
        console.log('Sample OFC:', JSON.stringify(ofcs[0], null, 2));
      }
    }

    // Check links table
    const { data: links, error: linksError } = await supabase
      .from('vulnerability_ofc_links')
      .select('*')
      .limit(5);

    if (linksError) {
      console.error('Error fetching links:', linksError);
    } else {
      console.log('\nLinks table:');
      console.log(`Count: ${links.length}`);
      if (links.length > 0) {
        console.log('Sample links:', JSON.stringify(links, null, 2));
      }
    }

    // Check if there are any other tables
    console.log('\nChecking for other tables...');
    const tables = ['questions', 'sources', 'sectors'];
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (!error) {
        console.log(`${table} table exists with ${data.length} records`);
      } else {
        console.log(`${table} table does not exist or has no data`);
      }
    }

  } catch (error) {
    console.error('Error checking new schema:', error);
  }
}

checkNewSchema();


