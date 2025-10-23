// Debug script to check source linking
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugSources() {
  console.log('🔍 Debugging source linking...');
  
  // Check what tables exist
  const tables = ['options_for_consideration', 'ofc_sources', 'sources', 'vulnerability_ofc_links'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(3);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${data.length} records`);
        if (data.length > 0) {
          console.log(`   Sample:`, Object.keys(data[0]));
        }
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  // Check if OFCs have sources field
  try {
    const { data: ofcs, error } = await supabase
      .from('options_for_consideration')
      .select('*')
      .limit(5);
    
    if (!error && ofcs.length > 0) {
      console.log('\n📋 OFC Structure:');
      console.log('Fields:', Object.keys(ofcs[0]));
      
      // Check if any OFC has a sources field
      const hasSources = ofcs.some(ofc => ofc.sources !== undefined);
      console.log('Has sources field:', hasSources);
      
      if (hasSources) {
        const withSources = ofcs.filter(ofc => ofc.sources);
        console.log('OFCs with sources:', withSources.length);
        console.log('Sample sources:', withSources[0]?.sources);
      }
    }
  } catch (err) {
    console.log('❌ Error checking OFCs:', err.message);
  }
}

debugSources();














