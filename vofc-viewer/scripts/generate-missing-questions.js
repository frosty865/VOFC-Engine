const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateMissingQuestions() {
  console.log('🔍 Scanning vulnerabilities for missing assessment questions...\n');

  try {
    // Get all vulnerabilities
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('id, vulnerability, discipline');

    if (vulnError) {
      console.error('❌ Error fetching vulnerabilities:', vulnError);
      return;
    }

    console.log(`📊 Found ${vulnerabilities.length} total vulnerabilities`);

    // Get all existing assessment questions to see which vulnerabilities already have questions
    const { data: existingQuestions, error: questionsError } = await supabase
      .from('assessment_questions')
      .select('vulnerability_id');

    if (questionsError) {
      console.error('❌ Error fetching existing questions:', questionsError);
      return;
    }

    const vulnerabilitiesWithQuestions = new Set(existingQuestions.map(q => q.vulnerability_id));
    const missingQuestions = vulnerabilities.filter(v => !vulnerabilitiesWithQuestions.has(v.id));

    console.log(`📋 ${missingQuestions.length} vulnerabilities missing assessment questions`);

    if (missingQuestions.length === 0) {
      console.log('✅ All vulnerabilities already have assessment questions!');
      return;
    }

    // Process each vulnerability missing questions
    for (const vulnerability of missingQuestions) {
      console.log(`\n🤖 Processing vulnerability: ${vulnerability.vulnerability.substring(0, 50)}...`);
      
      try {
        // Determine question type based on existing hierarchy
        const { data: parentQuestions, error: parentError } = await supabase
          .from('assessment_questions')
          .select('id')
          .eq('vulnerability_id', vulnerability.id)
          .eq('is_root', true);

        const needsParentQuestion = !parentError && parentQuestions.length === 0;
        const needsChildQuestion = !parentError && parentQuestions.length > 0;

        if (needsParentQuestion) {
          console.log('   📝 Generating parent question...');
          await generateQuestionForVulnerability(vulnerability, true);
        }

        if (needsChildQuestion) {
          console.log('   📝 Generating child question...');
          await generateQuestionForVulnerability(vulnerability, false);
        }

        // Generate 3-5 additional questions for comprehensive coverage
        const numAdditionalQuestions = Math.floor(Math.random() * 3) + 3; // 3-5 questions
        
        for (let i = 0; i < numAdditionalQuestions; i++) {
          await generateQuestionForVulnerability(vulnerability, false);
        }

        console.log(`   ✅ Generated questions for vulnerability ${vulnerability.id}`);

      } catch (vulnError) {
        console.error(`   ❌ Error processing vulnerability ${vulnerability.id}:`, vulnError);
      }
    }

    console.log('\n🎉 Question generation complete!');

  } catch (error) {
    console.error('❌ Error in question generation process:', error);
  }
}

async function generateQuestionForVulnerability(vulnerability, isRoot = false) {
  try {
    const { data: questionData, error: questionError } = await supabase.functions.invoke('generate-question-i18n', {
      body: { text: vulnerability.vulnerability }
    });

    if (!questionError && questionData) {
      const { error: insertError } = await supabase
        .from('assessment_questions')
        .insert([{
          vulnerability_id: vulnerability.id,
          question_text: questionData.en,
          question_en: questionData.en,
          question_es: questionData.es,
          is_root: isRoot
        }]);

      if (insertError) {
        console.error(`     ❌ Error inserting question: ${insertError.message}`);
      } else {
        console.log(`     ✅ Question inserted (${isRoot ? 'parent' : 'child'})`);
      }
    } else {
      console.error(`     ❌ Error generating question: ${questionError?.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`     ❌ Error in question generation: ${error.message}`);
  }
}

// Run the script
generateMissingQuestions();
