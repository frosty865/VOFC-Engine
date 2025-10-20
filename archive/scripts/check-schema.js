const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('Checking current database schema...\n');
  
  // Check vulnerabilities table
  const { data: vulnData, error: vulnError } = await supabase
    .from('vulnerabilities')
    .select('*')
    .limit(1);
  
  if (!vulnError && vulnData && vulnData.length > 0) {
    console.log('Vulnerabilities table fields:');
    console.log(Object.keys(vulnData[0]));
    console.log('Sample record:', JSON.stringify(vulnData[0], null, 2));
  } else {
    console.log('Vulnerabilities table error:', vulnError);
  }
  
  // Check options_for_consideration table
  const { data: ofcData, error: ofcError } = await supabase
    .from('options_for_consideration')
    .select('*')
    .limit(1);
  
  if (!ofcError && ofcData && ofcData.length > 0) {
    console.log('\nOptions for Consideration table fields:');
    console.log(Object.keys(ofcData[0]));
    console.log('Sample record:', JSON.stringify(ofcData[0], null, 2));
  } else {
    console.log('Options for Consideration table error:', ofcError);
  }
  
  // Check submissions table
  const { data: subData, error: subError } = await supabase
    .from('submissions')
    .select('*')
    .limit(1);
  
  if (!subError && subData && subData.length > 0) {
    console.log('\nSubmissions table fields:');
    console.log(Object.keys(subData[0]));
    console.log('Sample record:', JSON.stringify(subData[0], null, 2));
  } else {
    console.log('Submissions table error:', subError);
  }
}

checkSchema();


