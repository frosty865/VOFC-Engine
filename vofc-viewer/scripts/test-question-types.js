const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './vofc-viewer/.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testQuestionTypes() {
  console.log('🧪 Testing Root vs Child Question Generation...\n');

  const testVulnerability = "The facility does not have security cameras monitoring the perimeter";

  try {
    console.log(`📝 Vulnerability: "${testVulnerability}"\n`);

    // Test root question
    console.log('🌳 ROOT QUESTION:');
    const { data: rootData, error: rootError } = await supabase.functions.invoke('generate-question-i18n', {
      body: { text: testVulnerability, questionType: 'root' }
    });

    if (rootError) {
      console.error(`❌ Root Error: ${rootError.message}`);
    } else {
      console.log(`✅ English: ${rootData.en}`);
      console.log(`✅ Spanish: ${rootData.es}`);
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Test child question
    console.log('🌿 CHILD QUESTION:');
    const { data: childData, error: childError } = await supabase.functions.invoke('generate-question-i18n', {
      body: { text: testVulnerability, questionType: 'child' }
    });

    if (childError) {
      console.error(`❌ Child Error: ${childError.message}`);
    } else {
      console.log(`✅ English: ${childData.en}`);
      console.log(`✅ Spanish: ${childData.es}`);
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Test with different vulnerability
    const testVulnerability2 = "Access control systems are not functioning properly at main entrances";
    console.log(`📝 Vulnerability: "${testVulnerability2}"\n`);

    console.log('🌳 ROOT QUESTION:');
    const { data: rootData2, error: rootError2 } = await supabase.functions.invoke('generate-question-i18n', {
      body: { text: testVulnerability2, questionType: 'root' }
    });

    if (rootError2) {
      console.error(`❌ Root Error: ${rootError2.message}`);
    } else {
      console.log(`✅ English: ${rootData2.en}`);
      console.log(`✅ Spanish: ${rootData2.es}`);
    }

    console.log('\n🌿 CHILD QUESTION:');
    const { data: childData2, error: childError2 } = await supabase.functions.invoke('generate-question-i18n', {
      body: { text: testVulnerability2, questionType: 'child' }
    });

    if (childError2) {
      console.error(`❌ Child Error: ${childError2.message}`);
    } else {
      console.log(`✅ English: ${childData2.en}`);
      console.log(`✅ Spanish: ${childData2.es}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  testQuestionTypes()
    .then(() => {
      console.log('\n🎉 Question type testing complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script error:', error);
      process.exit(1);
    });
}
