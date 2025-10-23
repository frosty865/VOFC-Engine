import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseKey = 'sb_publishable_QuEn3h16DCAw3Jt_msFIiw_qBYy2Qzl';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOFCSourcesContent() {
  console.log('🔍 Checking OFC sources content...');
  
  try {
    // Get OFCs with sources field
    const { data: ofcs, error: ofcsError } = await supabase
      .from('options_for_consideration')
      .select('id, sources')
      .not('sources', 'is', null)
      .limit(10);

    if (ofcsError) {
      console.error('Error fetching OFCs:', ofcsError);
      return;
    }

    console.log(`Found ${ofcs.length} OFCs with sources field`);
    
    ofcs.forEach((ofc, index) => {
      console.log(`\nOFC ${index + 1} (${ofc.id}):`);
      console.log(`Sources: "${ofc.sources}"`);
      
      // Extract citation numbers
      const citationMatches = ofc.sources.match(/\[cite:\s*(\d+)\]/g);
      if (citationMatches) {
        console.log(`Citations found: ${citationMatches.join(', ')}`);
      } else {
        console.log('No citations found');
      }
    });

  } catch (error) {
    console.error('Error during check:', error);
  }
}

checkOFCSourcesContent();

