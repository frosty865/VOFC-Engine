const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpdm9oZ2J1dXd4b3lmeXpudHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3MzQ4NzksImV4cCI6MjA0NzMxMDg3OX0.sbp_d39a2982fd92e2a1089d2e590c571e081249a3a2';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugSources() {
  console.log('🔍 Debugging source data...');
  
  // Check ofc_sources
  const { data: ofcSources, error: ofcError } = await supabase
    .from('ofc_sources')
    .select('*')
    .limit(5);
    
  if (ofcError) {
    console.error('Error fetching ofc_sources:', ofcError);
  } else {
    console.log('OFC Sources:', ofcSources);
    if (ofcSources && ofcSources.length > 0) {
      const sourceIds = ofcSources.map(row => row.source_id);
      console.log('Source IDs found:', [...new Set(sourceIds)].sort());
    }
  }
  
  // Check sources
  const { data: sources, error: sourcesError } = await supabase
    .from('sources')
    .select('*')
    .limit(5);
    
  if (sourcesError) {
    console.error('Error fetching sources:', sourcesError);
  } else {
    console.log('Sources:', sources);
    if (sources && sources.length > 0) {
      const referenceNumbers = sources.map(row => row.reference_number);
      console.log('Reference numbers found:', [...new Set(referenceNumbers)].sort());
    }
  }
}

debugSources();

