// Script to restore sources that were accidentally wiped
const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreSources() {
  console.log('🔧 Attempting to restore sources...');
  
  // Check if ofc_sources table has the linking data
  const { data: ofcSources, error: ofcSourcesError } = await supabase
    .from('ofc_sources')
    .select('*')
    .limit(10);
  
  if (ofcSourcesError) {
    console.error('Error fetching ofc_sources:', ofcSourcesError);
    return;
  }
  
  console.log(`Found ${ofcSources.length} OFC-source links`);
  
  if (ofcSources.length > 0) {
    console.log('Sample ofc_sources:', ofcSources[0]);
    
    // Group by ofc_id to create citation strings
    const ofcSourceMap = {};
    ofcSources.forEach(link => {
      if (!ofcSourceMap[link.ofc_id]) {
        ofcSourceMap[link.ofc_id] = [];
      }
      ofcSourceMap[link.ofc_id].push(link.source_id);
    });
    
    console.log('OFC source mapping:', Object.keys(ofcSourceMap).length, 'OFCs with sources');
    
    // Update OFCs with their source citations
    for (const [ofcId, sourceIds] of Object.entries(ofcSourceMap)) {
      const citationString = `[cite: ${sourceIds.join(', ')}]`;
      
      const { error: updateError } = await supabase
        .from('options_for_consideration')
        .update({ sources: citationString })
        .eq('id', ofcId);
      
      if (updateError) {
        console.error(`Error updating OFC ${ofcId}:`, updateError);
      } else {
        console.log(`✅ Updated OFC ${ofcId} with sources: ${citationString}`);
      }
    }
  }
  
  // Check vulnerabilities table
  const { data: vulnerabilities, error: vulnError } = await supabase
    .from('vulnerabilities')
    .select('*')
    .limit(5);
  
  if (vulnError) {
    console.error('Error fetching vulnerabilities:', vulnError);
  } else {
    console.log(`Found ${vulnerabilities.length} vulnerabilities`);
    const withSources = vulnerabilities.filter(v => v.source);
    console.log(`Vulnerabilities with sources: ${withSources.length}/${vulnerabilities.length}`);
  }
}

restoreSources();







