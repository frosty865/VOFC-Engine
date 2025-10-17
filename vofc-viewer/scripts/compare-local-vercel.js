const { createClient } = require('@supabase/supabase-js');

// Use production environment variables (same as Vercel)
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function compareLocalVercel() {
  console.log('🔍 Comparing local data with Vercel deployment...\n');

  try {
    // Test the same query that the app uses
    console.log('📊 Testing OFC query with sources (same as deployed app)...');
    const { data: ofcData, error: ofcError } = await supabase
      .from('options_for_consideration')
      .select(`
        *,
        ofc_sources (
          *,
          sources (
            "reference number",
            source
          )
        )
      `)
      .limit(5);

    if (ofcError) {
      console.log('❌ OFC query failed:', ofcError.message);
    } else {
      console.log('✅ OFC query succeeded');
      console.log(`📊 Found ${ofcData.length} OFCs with sources`);
      
      // Show sample data
      ofcData.forEach((ofc, idx) => {
        console.log(`\nOFC ${idx + 1}:`);
        console.log('ID:', ofc.id);
        console.log('Sources column:', ofc.sources);
        console.log('OFC Sources links:', ofc.ofc_sources?.length || 0);
        if (ofc.ofc_sources && ofc.ofc_sources.length > 0) {
          console.log('Sample source:', ofc.ofc_sources[0].sources);
        }
      });
    }

    // Test vulnerabilities query
    console.log('\n📊 Testing vulnerabilities query...');
    const { data: vulnData, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('*')
      .limit(3);

    if (vulnError) {
      console.log('❌ Vulnerabilities query failed:', vulnError.message);
    } else {
      console.log('✅ Vulnerabilities query succeeded');
      console.log(`📊 Found ${vulnData.length} vulnerabilities`);
    }

    // Test sources table
    console.log('\n📊 Testing sources table...');
    const { data: sourcesData, error: sourcesError } = await supabase
      .from('sources')
      .select('*')
      .limit(3);

    if (sourcesError) {
      console.log('❌ Sources query failed:', sourcesError.message);
    } else {
      console.log('✅ Sources query succeeded');
      console.log(`📊 Found ${sourcesData.length} sources`);
      if (sourcesData.length > 0) {
        console.log('Sample source:', sourcesData[0]);
      }
    }

    console.log('\n🎉 Data comparison completed!');
    console.log('\n📋 Summary:');
    console.log('- The data shown above is what the Vercel deployment will see');
    console.log('- If you see OFCs with sources, the app should display them');
    console.log('- If sources are null/empty, the app will show no sources section');

  } catch (error) {
    console.error('❌ Comparison failed:', error);
  }
}

if (require.main === module) {
  compareLocalVercel()
    .then(() => {
      console.log('\n✅ Local vs Vercel comparison completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Comparison error:', error);
      process.exit(1);
    });
}

module.exports = { compareLocalVercel };
