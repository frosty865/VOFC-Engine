const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEdgeFunction() {
  console.log('🚀 Testing Edge Function: generate-question-i18n');
  
  try {
    const { data, error } = await supabase.functions.invoke('generate-question-i18n', {
      body: {
        text: "perimeter lighting is inadequate"
      }
    });

    if (error) {
      console.error('❌ Function error:', error);
    } else {
      console.log('✅ Function response:', data);
    }
  } catch (err) {
    console.error('❌ Request error:', err);
  }
}

testEdgeFunction();
