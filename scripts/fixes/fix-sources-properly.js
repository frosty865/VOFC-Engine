// Fix sources properly by checking the actual data
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSourcesProperly() {
  console.log('🔧 Fixing sources properly...');
  
  // Get all OFCs
  const { data: ofcs, error: ofcsError } = await supabase
    .from('options_for_consideration')
    .select('*')
    .limit(5);
  
  if (ofcsError) {
    console.error('Error fetching OFCs:', ofcsError);
    return;
  }
  
  console.log(`Found ${ofcs.length} OFCs`);
  console.log('Sample OFC:', ofcs[0]);
  
  // Get all ofc_sources links
  const { data: ofcSources, error: ofcSourcesError } = await supabase
    .from('ofc_sources')
    .select('*');
  
  if (ofcSourcesError) {
    console.error('Error fetching ofc_sources:', ofcSourcesError);
    return;
  }
  
  console.log(`Found ${ofcSources.length} OFC-source links`);
  
  // Group by ofc_id
  const ofcSourceMap = {};
  ofcSources.forEach(link => {
    if (!ofcSourceMap[link.ofc_id]) {
      ofcSourceMap[link.ofc_id] = [];
    }
    ofcSourceMap[link.ofc_id].push(link.source_id);
  });
  
  console.log(`OFCs with source links: ${Object.keys(ofcSourceMap).length}`);
  
  // Update each OFC with its sources
  for (const [ofcId, sourceIds] of Object.entries(ofcSourceMap)) {
    const citationString = `[cite: ${sourceIds.join(', ')}]`;
    
    console.log(`Updating OFC ${ofcId} with sources: ${citationString}`);
    
    const { error: updateError } = await supabase
      .from('options_for_consideration')
      .update({ sources: citationString })
      .eq('id', ofcId);
    
    if (updateError) {
      console.error(`Error updating OFC ${ofcId}:`, updateError);
    } else {
      console.log(`✅ Updated OFC ${ofcId}`);
    }
  }
  
  // Verify the update
  const { data: updatedOfcs, error: verifyError } = await supabase
    .from('options_for_consideration')
    .select('id, sources')
    .limit(3);
  
  if (!verifyError) {
    console.log('\n✅ Verification - Updated OFCs:');
    updatedOfcs.forEach(ofc => {
      console.log(`  ${ofc.id}: ${ofc.sources}`);
    });
  }
}

fixSourcesProperly();







