const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOFCColumns() {
  console.log('🔍 Checking OFC columns for citations...\n');

  try {
    // Get a sample OFC record to see all columns
    const { data: ofcData, error: ofcError } = await supabase
      .from('options_for_consideration')
      .select('*')
      .limit(3);

    if (ofcError) {
      console.log('❌ OFC query failed:', ofcError.message);
    } else {
      console.log('✅ OFC query succeeded');
      console.log('📊 OFC columns:', Object.keys(ofcData[0]));
      console.log('\n📊 Sample OFC data:');
      ofcData.forEach((ofc, idx) => {
        console.log(`\nOFC ${idx + 1}:`);
        console.log('ID:', ofc.id);
        console.log('Option Text:', ofc.option_text?.substring(0, 100) + '...');
        console.log('Sources:', ofc.sources);
        console.log('Source:', ofc.source);
        console.log('Discipline:', ofc.discipline);
        console.log('All fields:', JSON.stringify(ofc, null, 2));
      });
    }

  } catch (error) {
    console.error('❌ OFC columns check failed:', error);
  }
}

if (require.main === module) {
  checkOFCColumns()
    .then(() => {
      console.log('\n✅ OFC columns check completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ OFC columns check error:', error);
      process.exit(1);
    });
}

module.exports = { checkOFCColumns };
