const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAssessmentTableStructure() {
  console.log('🔍 Checking assessment_questions table structure...\n');

  try {
    // Try to get one record to see the structure
    const { data, error } = await supabase
      .from('assessment_questions')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Error accessing table:', error.message);
      console.log('📋 Error code:', error.code);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Table structure:');
      console.log('Columns:', Object.keys(data[0]));
      console.log('Sample data:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('📋 Table is empty, checking with a simple insert...');
      
      // Try a minimal insert to see what columns exist
      const { data: insertData, error: insertError } = await supabase
        .from('assessment_questions')
        .insert([{
          question_text: "Test question"
        }])
        .select();

      if (insertError) {
        console.log('❌ Insert error:', insertError.message);
        console.log('📋 This tells us what columns are missing or incorrect');
      } else {
        console.log('✅ Minimal insert worked:', insertData);
        
        // Clean up the test record
        await supabase
          .from('assessment_questions')
          .delete()
          .eq('question_text', 'Test question');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAssessmentTableStructure();

