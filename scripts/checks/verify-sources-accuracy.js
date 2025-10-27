// Verify the accuracy of the sources I restored
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifySourcesAccuracy() {
  console.log('🔍 Verifying source accuracy...');
  
  // Check a few specific OFCs to see their current sources
  const { data: ofcs, error: ofcsError } = await supabase
    .from('options_for_consideration')
    .select('id, sources, option_text')
    .limit(5);
  
  if (ofcsError) {
    console.error('Error fetching OFCs:', ofcsError);
    return;
  }
  
  console.log('Current OFCs and their sources:');
  ofcs.forEach(ofc => {
    console.log(`\nOFC ID: ${ofc.id}`);
    console.log(`Sources: ${ofc.sources}`);
    console.log(`Option text: ${ofc.option_text.substring(0, 100)}...`);
  });
  
  // Check the ofc_sources table to see what links exist
  const { data: ofcSources, error: ofcSourcesError } = await supabase
    .from('ofc_sources')
    .select('*')
    .limit(5);
  
  if (ofcSourcesError) {
    console.error('Error fetching ofc_sources:', ofcSourcesError);
    return;
  }
  
  console.log('\n\nOFC-Source links:');
  ofcSources.forEach(link => {
    console.log(`OFC ${link.ofc_id} -> Source ${link.source_id}`);
  });
  
  // Check if there are any OFCs that actually have sources populated
  const { data: ofcsWithSources, error: ofcsWithSourcesError } = await supabase
    .from('options_for_consideration')
    .select('id, sources')
    .not('sources', 'is', null)
    .limit(5);
  
  if (ofcsWithSourcesError) {
    console.error('Error fetching OFCs with sources:', ofcsWithSourcesError);
  } else {
    console.log(`\n\nOFCs with non-null sources: ${ofcsWithSources.length}`);
    ofcsWithSources.forEach(ofc => {
      console.log(`OFC ${ofc.id}: ${ofc.sources}`);
    });
  }
}

verifySourcesAccuracy();







