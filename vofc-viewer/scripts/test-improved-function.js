const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './vofc-viewer/.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testImprovedFunction() {
  console.log('🧪 Testing improved Edge Function with different vulnerabilities...\n');

  const testCases = [
    "The facility does not have security cameras monitoring the perimeter",
    "Access control systems are not functioning properly at main entrances",
    "Fire safety systems have not been tested in over a year",
    "The facility lacks proper lighting around the building perimeter",
    "Security personnel are not properly trained on emergency procedures"
  ];

  for (const testCase of testCases) {
    try {
      console.log(`📝 Testing: "${testCase}"`);
      
      const { data, error } = await supabase.functions.invoke('generate-question-i18n', {
        body: { text: testCase }
      });

      if (error) {
        console.error(`❌ Error: ${error.message}`);
      } else {
        console.log(`✅ English: ${data.en}`);
        console.log(`✅ Spanish: ${data.es}`);
      }
      console.log('---');
    } catch (err) {
      console.error(`❌ Test failed: ${err.message}`);
    }
  }
}

if (require.main === module) {
  testImprovedFunction()
    .then(() => {
      console.log('\n🎉 Testing complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script error:', error);
      process.exit(1);
    });
}
