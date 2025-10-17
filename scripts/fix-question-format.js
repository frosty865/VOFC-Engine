#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function to clean and fix question text
function cleanQuestionText(text) {
  if (!text) return text;
  
  let cleaned = text.trim();
  
  // Remove duplicate question marks
  cleaned = cleaned.replace(/\?+/g, '?');
  
  // Fix common patterns where questions are duplicated or malformed
  // Pattern 1: "How effectively does the site manage does the facility have..."
  cleaned = cleaned.replace(/^How effectively does the site manage\s+/i, '');
  cleaned = cleaned.replace(/^How effectively does the organization manage\s+/i, '');
  cleaned = cleaned.replace(/^How effectively does the facility manage\s+/i, '');
  
  // Pattern 2: "Has the organization implemented does the facility have..."
  cleaned = cleaned.replace(/^Has the organization implemented\s+/i, '');
  cleaned = cleaned.replace(/^Has the facility implemented\s+/i, '');
  cleaned = cleaned.replace(/^Has the site implemented\s+/i, '');
  
  // Pattern 3: "Does the organization have does the facility have..."
  cleaned = cleaned.replace(/^Does the organization have\s+/i, '');
  cleaned = cleaned.replace(/^Does the site have\s+/i, '');
  
  // Pattern 4: "Is the organization does the facility..."
  cleaned = cleaned.replace(/^Is the organization\s+/i, '');
  cleaned = cleaned.replace(/^Is the site\s+/i, '');
  
  // Pattern 5: "Are there does the facility..."
  cleaned = cleaned.replace(/^Are there\s+/i, '');
  
  // Pattern 6: "What is does the facility..."
  cleaned = cleaned.replace(/^What is\s+/i, '');
  
  // Pattern 7: "Where is does the facility..."
  cleaned = cleaned.replace(/^Where is\s+/i, '');
  
  // Pattern 8: "When is does the facility..."
  cleaned = cleaned.replace(/^When is\s+/i, '');
  
  // Pattern 9: "Who is does the facility..."
  cleaned = cleaned.replace(/^Who is\s+/i, '');
  
  // Pattern 10: "Why is does the facility..."
  cleaned = cleaned.replace(/^Why is\s+/i, '');
  
  // Pattern 11: "How is does the facility..."
  cleaned = cleaned.replace(/^How is\s+/i, '');
  
  // Pattern 12: "How does does the facility..."
  cleaned = cleaned.replace(/^How does\s+/i, '');
  
  // Pattern 13: "How can does the facility..."
  cleaned = cleaned.replace(/^How can\s+/i, '');
  
  // Pattern 14: "How will does the facility..."
  cleaned = cleaned.replace(/^How will\s+/i, '');
  
  // Pattern 15: "How should does the facility..."
  cleaned = cleaned.replace(/^How should\s+/i, '');
  
  // Pattern 16: "How would does the facility..."
  cleaned = cleaned.replace(/^How would\s+/i, '');
  
  // Pattern 17: "How could does the facility..."
  cleaned = cleaned.replace(/^How could\s+/i, '');
  
  // Pattern 18: "How might does the facility..."
  cleaned = cleaned.replace(/^How might\s+/i, '');
  
  // Pattern 19: "How often does the facility..."
  cleaned = cleaned.replace(/^How often\s+/i, '');
  
  // Pattern 20: "How many does the facility..."
  cleaned = cleaned.replace(/^How many\s+/i, '');
  
  // Pattern 21: "How much does the facility..."
  cleaned = cleaned.replace(/^How much\s+/i, '');
  
  // Pattern 22: "How long does the facility..."
  cleaned = cleaned.replace(/^How long\s+/i, '');
  
  // Pattern 23: "How far does the facility..."
  cleaned = cleaned.replace(/^How far\s+/i, '');
  
  // Pattern 24: "How close does the facility..."
  cleaned = cleaned.replace(/^How close\s+/i, '');
  
  // Pattern 25: "How near does the facility..."
  cleaned = cleaned.replace(/^How near\s+/i, '');
  
  // Pattern 26: "How safe does the facility..."
  cleaned = cleaned.replace(/^How safe\s+/i, '');
  
  // Pattern 27: "How secure does the facility..."
  cleaned = cleaned.replace(/^How secure\s+/i, '');
  
  // Pattern 28: "How protected does the facility..."
  cleaned = cleaned.replace(/^How protected\s+/i, '');
  
  // Pattern 29: "How guarded does the facility..."
  cleaned = cleaned.replace(/^How guarded\s+/i, '');
  
  // Pattern 30: "How monitored does the facility..."
  cleaned = cleaned.replace(/^How monitored\s+/i, '');
  
  // Pattern 31: "How controlled does the facility..."
  cleaned = cleaned.replace(/^How controlled\s+/i, '');
  
  // Pattern 32: "How managed does the facility..."
  cleaned = cleaned.replace(/^How managed\s+/i, '');
  
  // Pattern 33: "How operated does the facility..."
  cleaned = cleaned.replace(/^How operated\s+/i, '');
  
  // Pattern 34: "How maintained does the facility..."
  cleaned = cleaned.replace(/^How maintained\s+/i, '');
  
  // Pattern 35: "How serviced does the facility..."
  cleaned = cleaned.replace(/^How serviced\s+/i, '');
  
  // Pattern 36: "How repaired does the facility..."
  cleaned = cleaned.replace(/^How repaired\s+/i, '');
  
  // Pattern 37: "How updated does the facility..."
  cleaned = cleaned.replace(/^How updated\s+/i, '');
  
  // Pattern 38: "How upgraded does the facility..."
  cleaned = cleaned.replace(/^How upgraded\s+/i, '');
  
  // Pattern 39: "How modernized does the facility..."
  cleaned = cleaned.replace(/^How modernized\s+/i, '');
  
  // Pattern 40: "How improved does the facility..."
  cleaned = cleaned.replace(/^How improved\s+/i, '');
  
  // Pattern 41: "How enhanced does the facility..."
  cleaned = cleaned.replace(/^How enhanced\s+/i, '');
  
  // Pattern 42: "How optimized does the facility..."
  cleaned = cleaned.replace(/^How optimized\s+/i, '');
  
  // Pattern 43: "How streamlined does the facility..."
  cleaned = cleaned.replace(/^How streamlined\s+/i, '');
  
  // Pattern 44: "How simplified does the facility..."
  cleaned = cleaned.replace(/^How simplified\s+/i, '');
  
  // Pattern 45: "How automated does the facility..."
  cleaned = cleaned.replace(/^How automated\s+/i, '');
  
  // Pattern 46: "How digitized does the facility..."
  cleaned = cleaned.replace(/^How digitized\s+/i, '');
  
  // Pattern 47: "How computerized does the facility..."
  cleaned = cleaned.replace(/^How computerized\s+/i, '');
  
  // Pattern 48: "How electronic does the facility..."
  cleaned = cleaned.replace(/^How electronic\s+/i, '');
  
  // Pattern 49: "How digital does the facility..."
  cleaned = cleaned.replace(/^How digital\s+/i, '');
  
  // Pattern 50: "How online does the facility..."
  cleaned = cleaned.replace(/^How online\s+/i, '');
  
  // Pattern 51: "How connected does the facility..."
  cleaned = cleaned.replace(/^How connected\s+/i, '');
  
  // Pattern 52: "How networked does the facility..."
  cleaned = cleaned.replace(/^How networked\s+/i, '');
  
  // Pattern 53: "How integrated does the facility..."
  cleaned = cleaned.replace(/^How integrated\s+/i, '');
  
  // Pattern 54: "How coordinated does the facility..."
  cleaned = cleaned.replace(/^How coordinated\s+/i, '');
  
  // Pattern 55: "How synchronized does the facility..."
  cleaned = cleaned.replace(/^How synchronized\s+/i, '');
  
  // Pattern 56: "How aligned does the facility..."
  cleaned = cleaned.replace(/^How aligned\s+/i, '');
  
  // Pattern 57: "How consistent does the facility..."
  cleaned = cleaned.replace(/^How consistent\s+/i, '');
  
  // Pattern 58: "How standardized does the facility..."
  cleaned = cleaned.replace(/^How standardized\s+/i, '');
  
  // Pattern 59: "How uniform does the facility..."
  cleaned = cleaned.replace(/^How uniform\s+/i, '');
  
  // Pattern 60: "How regular does the facility..."
  cleaned = cleaned.replace(/^How regular\s+/i, '');
  
  // Pattern 61: "How routine does the facility..."
  cleaned = cleaned.replace(/^How routine\s+/i, '');
  
  // Pattern 62: "How systematic does the facility..."
  cleaned = cleaned.replace(/^How systematic\s+/i, '');
  
  // Pattern 63: "How methodical does the facility..."
  cleaned = cleaned.replace(/^How methodical\s+/i, '');
  
  // Pattern 64: "How organized does the facility..."
  cleaned = cleaned.replace(/^How organized\s+/i, '');
  
  // Pattern 65: "How structured does the facility..."
  cleaned = cleaned.replace(/^How structured\s+/i, '');
  
  // Pattern 66: "How planned does the facility..."
  cleaned = cleaned.replace(/^How planned\s+/i, '');
  
  // Pattern 67: "How designed does the facility..."
  cleaned = cleaned.replace(/^How designed\s+/i, '');
  
  // Pattern 68: "How built does the facility..."
  cleaned = cleaned.replace(/^How built\s+/i, '');
  
  // Pattern 69: "How constructed does the facility..."
  cleaned = cleaned.replace(/^How constructed\s+/i, '');
  
  // Pattern 70: "How installed does the facility..."
  cleaned = cleaned.replace(/^How installed\s+/i, '');
  
  // Pattern 71: "How deployed does the facility..."
  cleaned = cleaned.replace(/^How deployed\s+/i, '');
  
  // Pattern 72: "How implemented does the facility..."
  cleaned = cleaned.replace(/^How implemented\s+/i, '');
  
  // Pattern 73: "How established does the facility..."
  cleaned = cleaned.replace(/^How established\s+/i, '');
  
  // Pattern 74: "How created does the facility..."
  cleaned = cleaned.replace(/^How created\s+/i, '');
  
  // Pattern 75: "How developed does the facility..."
  cleaned = cleaned.replace(/^How developed\s+/i, '');
  
  // Pattern 76: "How formed does the facility..."
  cleaned = cleaned.replace(/^How formed\s+/i, '');
  
  // Pattern 77: "How shaped does the facility..."
  cleaned = cleaned.replace(/^How shaped\s+/i, '');
  
  // Pattern 78: "How molded does the facility..."
  cleaned = cleaned.replace(/^How molded\s+/i, '');
  
  // Pattern 79: "How fashioned does the facility..."
  cleaned = cleaned.replace(/^How fashioned\s+/i, '');
  
  // Pattern 80: "How crafted does the facility..."
  cleaned = cleaned.replace(/^How crafted\s+/i, '');
  
  // Pattern 81: "How made does the facility..."
  cleaned = cleaned.replace(/^How made\s+/i, '');
  
  // Pattern 82: "How produced does the facility..."
  cleaned = cleaned.replace(/^How produced\s+/i, '');
  
  // Pattern 83: "How generated does the facility..."
  cleaned = cleaned.replace(/^How generated\s+/i, '');
  
  // Pattern 84: "How created does the facility..."
  cleaned = cleaned.replace(/^How created\s+/i, '');
  
  // Pattern 85: "How manufactured does the facility..."
  cleaned = cleaned.replace(/^How manufactured\s+/i, '');
  
  // Pattern 86: "How fabricated does the facility..."
  cleaned = cleaned.replace(/^How fabricated\s+/i, '');
  
  // Pattern 87: "How assembled does the facility..."
  cleaned = cleaned.replace(/^How assembled\s+/i, '');
  
  // Pattern 88: "How constructed does the facility..."
  cleaned = cleaned.replace(/^How constructed\s+/i, '');
  
  // Pattern 89: "How erected does the facility..."
  cleaned = cleaned.replace(/^How erected\s+/i, '');
  
  // Pattern 90: "How raised does the facility..."
  cleaned = cleaned.replace(/^How raised\s+/i, '');
  
  // Pattern 91: "How built does the facility..."
  cleaned = cleaned.replace(/^How built\s+/i, '');
  
  // Pattern 92: "How constructed does the facility..."
  cleaned = cleaned.replace(/^How constructed\s+/i, '');
  
  // Pattern 93: "How established does the facility..."
  cleaned = cleaned.replace(/^How established\s+/i, '');
  
  // Pattern 94: "How founded does the facility..."
  cleaned = cleaned.replace(/^How founded\s+/i, '');
  
  // Pattern 95: "How initiated does the facility..."
  cleaned = cleaned.replace(/^How initiated\s+/i, '');
  
  // Pattern 96: "How started does the facility..."
  cleaned = cleaned.replace(/^How started\s+/i, '');
  
  // Pattern 97: "How begun does the facility..."
  cleaned = cleaned.replace(/^How begun\s+/i, '');
  
  // Pattern 98: "How commenced does the facility..."
  cleaned = cleaned.replace(/^How commenced\s+/i, '');
  
  // Pattern 99: "How launched does the facility..."
  cleaned = cleaned.replace(/^How launched\s+/i, '');
  
  // Pattern 100: "How opened does the facility..."
  cleaned = cleaned.replace(/^How opened\s+/i, '');
  
  // Ensure the question starts with a capital letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  // Ensure the question ends with a question mark
  if (!cleaned.endsWith('?')) {
    cleaned += '?';
  }
  
  return cleaned;
}

async function analyzeQuestions() {
  console.log('🔍 Analyzing question formatting issues...\n');
  
  const { data, error } = await supabase
    .from('questions')
    .select('id, record_text')
    .limit(20);
  
  if (error) {
    console.error('❌ Error fetching questions:', error);
    return;
  }
  
  console.log('📋 Sample questions before cleaning:');
  data.forEach((q, index) => {
    console.log(`${index + 1}. ID: ${q.id}`);
    console.log(`   Original: ${q.record_text}`);
    console.log(`   Cleaned:  ${cleanQuestionText(q.record_text)}`);
    console.log('---');
  });
}

async function fixAllQuestions() {
  console.log('🔧 Fixing all question formatting...\n');
  
  // Get all questions
  const { data: questions, error: fetchError } = await supabase
    .from('questions')
    .select('id, record_text');
  
  if (fetchError) {
    console.error('❌ Error fetching questions:', fetchError);
    return;
  }
  
  console.log(`📊 Found ${questions.length} questions to process`);
  
  let fixedCount = 0;
  let unchangedCount = 0;
  
  for (const question of questions) {
    const originalText = question.record_text;
    const cleanedText = cleanQuestionText(originalText);
    
    if (originalText !== cleanedText) {
      // Update the question in the database
      const { error: updateError } = await supabase
        .from('questions')
        .update({ record_text: cleanedText })
        .eq('id', question.id);
      
      if (updateError) {
        console.error(`❌ Error updating question ${question.id}:`, updateError);
      } else {
        fixedCount++;
        console.log(`✅ Fixed question ${question.id}`);
        console.log(`   Before: ${originalText}`);
        console.log(`   After:  ${cleanedText}`);
        console.log('---');
      }
    } else {
      unchangedCount++;
    }
  }
  
  console.log(`\n🎉 Question formatting fix completed!`);
  console.log(`✅ Fixed: ${fixedCount} questions`);
  console.log(`➖ Unchanged: ${unchangedCount} questions`);
}

// Run the analysis first
analyzeQuestions().then(() => {
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Ask if user wants to proceed with fixing
  console.log('⚠️  This will update ALL questions in the database.');
  console.log('   Do you want to proceed? (This is a dry run - no changes will be made)');
  
  // For now, just show what would be changed
  console.log('\n🔍 This is a preview of what would be changed.');
  console.log('   To actually fix the questions, uncomment the fixAllQuestions() call below.');
  
  // Uncomment the next line to actually fix the questions:
  // fixAllQuestions();
});

