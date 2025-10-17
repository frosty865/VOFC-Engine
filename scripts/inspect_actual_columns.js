const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectActualColumns() {
  console.log('Inspecting actual database columns...\n');
  
  try {
    // Check vulnerabilities table
    console.log('=== VULNERABILITIES TABLE ===');
    const { data: vulnData, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('*')
      .limit(3);
    
    if (vulnError) {
      console.log('❌ Vulnerabilities error:', vulnError.message);
    } else {
      console.log('✅ Vulnerabilities accessible');
      if (vulnData && vulnData.length > 0) {
        console.log('Columns:', Object.keys(vulnData[0]));
        console.log('Sample data:', JSON.stringify(vulnData[0], null, 2));
      } else {
        console.log('Table is empty');
      }
    }
    
    // Check OFCs table
    console.log('\n=== OFCS TABLE ===');
    const { data: ofcData, error: ofcError } = await supabase
      .from('ofcs')
      .select('*')
      .limit(3);
    
    if (ofcError) {
      console.log('❌ OFCs error:', ofcError.message);
    } else {
      console.log('✅ OFCs accessible');
      if (ofcData && ofcData.length > 0) {
        console.log('Columns:', Object.keys(ofcData[0]));
        console.log('Sample data:', JSON.stringify(ofcData[0], null, 2));
      } else {
        console.log('Table is empty');
      }
    }
    
    // Check if there are other table names
    console.log('\n=== CHECKING ALTERNATIVE TABLE NAMES ===');
    const alternativeTables = ['vulnerability', 'ofc', 'answers', 'parent_questions'];
    
    for (const table of alternativeTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table} exists`);
          if (data && data.length > 0) {
            console.log(`  Columns: ${Object.keys(data[0]).join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error inspecting columns:', error);
  }
}

inspectActualColumns();


