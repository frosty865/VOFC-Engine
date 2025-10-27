// Check if we can find the original source data to verify accuracy
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOriginalSources() {
  console.log('🔍 Checking for original source data...');
  
  // Check if there are any backup tables or if we can find the original sources
  const { data: allSources, error: sourcesError } = await supabase
    .from('sources')
    .select('*')
    .order('reference_number')
    .limit(10);
  
  if (sourcesError) {
    console.error('Error fetching sources:', sourcesError);
    return;
  }
  
  console.log('Available sources in the database:');
  allSources.forEach(source => {
    console.log(`\nReference ${source.reference_number}:`);
    console.log(`Source: ${source.source.substring(0, 200)}...`);
  });
  
  // Check if there are any OFCs that might have had their sources wiped
  const { data: ofcsWithoutSources, error: ofcsWithoutSourcesError } = await supabase
    .from('options_for_consideration')
    .select('id, sources, option_text')
    .is('sources', null)
    .limit(5);
  
  if (ofcsWithoutSourcesError) {
    console.error('Error fetching OFCs without sources:', ofcsWithoutSourcesError);
  } else {
    console.log(`\n\nOFCs without sources (${ofcsWithoutSources.length}):`);
    ofcsWithoutSources.forEach(ofc => {
      console.log(`\nOFC ${ofc.id}:`);
      console.log(`Text: ${ofc.option_text.substring(0, 100)}...`);
    });
  }
  
  // Check if there are any duplicate entries in ofc_sources
  const { data: ofcSources, error: ofcSourcesError } = await supabase
    .from('ofc_sources')
    .select('*')
    .limit(10);
  
  if (ofcSourcesError) {
    console.error('Error fetching ofc_sources:', ofcSourcesError);
  } else {
    console.log('\n\nOFC-Source links (checking for duplicates):');
    const linkCounts = {};
    ofcSources.forEach(link => {
      const key = `${link.ofc_id}-${link.source_id}`;
      linkCounts[key] = (linkCounts[key] || 0) + 1;
    });
    
    const duplicates = Object.entries(linkCounts).filter(([key, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('⚠️  Found duplicate links:');
      duplicates.forEach(([key, count]) => {
        console.log(`  ${key}: ${count} times`);
      });
    } else {
      console.log('✅ No duplicate links found');
    }
  }
}

checkOriginalSources();







