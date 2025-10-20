// Test the Edge Function directly using fetch
async function testFunctionDirect() {
  console.log('🧪 Testing Edge Function directly...\n');

  const testCases = [
    {
      text: "The facility does not have security cameras monitoring the perimeter",
      questionType: 'root'
    },
    {
      text: "The facility does not have security cameras monitoring the perimeter", 
      questionType: 'child'
    },
    {
      text: "Access control systems are not functioning properly at main entrances",
      questionType: 'root'
    },
    {
      text: "Access control systems are not functioning properly at main entrances",
      questionType: 'child'
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`📝 Testing: "${testCase.text}" (${testCase.questionType})`);
      
      const response = await fetch('https://wivohgbuuwxoyfyzntsd.supabase.co/functions/v1/generate-question-i18n', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: testCase.text,
          questionType: testCase.questionType
        })
      });

      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`❌ Error Details: ${errorText}`);
        continue;
      }

      const data = await response.json();
      console.log(`✅ English: ${data.en}`);
      console.log(`✅ Spanish: ${data.es}`);
      console.log('---');
    } catch (err) {
      console.error(`❌ Test failed: ${err.message}`);
    }
  }
}

if (require.main === module) {
  testFunctionDirect()
    .then(() => {
      console.log('\n🎉 Direct function testing complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script error:', error);
      process.exit(1);
    });
}

