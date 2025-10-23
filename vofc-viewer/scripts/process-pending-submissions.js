#!/usr/bin/env node

/**
 * Process pending submissions with the enhanced parser
 * This script checks for submissions that haven't been processed yet
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🔍 Checking for pending submissions...');
console.log('=====================================\n');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkPendingSubmissions() {
  try {
    console.log('📊 Fetching submissions from database...');
    
    // Get all submissions
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`📋 Found ${submissions.length} total submissions`);
    
    // Categorize submissions
    const pending = submissions.filter(s => s.status === 'pending_review');
    const approved = submissions.filter(s => s.status === 'approved');
    const rejected = submissions.filter(s => s.status === 'rejected');
    
    console.log(`⏳ Pending review: ${pending.length}`);
    console.log(`✅ Approved: ${approved.length}`);
    console.log(`❌ Rejected: ${rejected.length}`);
    
    // Check for submissions that might need parsing
    const unprocessed = submissions.filter(s => {
      // Check if submission has been processed by the enhanced parser
      const data = typeof s.data === 'string' ? JSON.parse(s.data) : s.data;
      return !data.parsed_content || !data.enhanced_extraction;
    });
    
    console.log(`\n🔍 Unprocessed submissions: ${unprocessed.length}`);
    
    if (unprocessed.length > 0) {
      console.log('\n📝 Unprocessed submissions:');
      unprocessed.forEach((sub, idx) => {
        const data = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;
        console.log(`${idx + 1}. ID: ${sub.id.slice(0, 8)}... | Type: ${sub.type} | Status: ${sub.status}`);
        console.log(`   Data: ${JSON.stringify(data).substring(0, 100)}...`);
      });
      
      // Ask if user wants to process them
      console.log('\n🤔 Would you like to process these submissions with the enhanced parser?');
      console.log('   This will extract structured content from the submission data.');
      
      // For now, just show what would be processed
      console.log('\n📋 Processing plan:');
      unprocessed.forEach((sub, idx) => {
        console.log(`${idx + 1}. Process submission ${sub.id.slice(0, 8)}... with enhanced parser`);
      });
    } else {
      console.log('✅ All submissions appear to be processed!');
    }
    
    // Show recent submissions for context
    console.log('\n📊 Recent submissions (last 5):');
    submissions.slice(0, 5).forEach((sub, idx) => {
      const data = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;
      console.log(`${idx + 1}. ${sub.type} | ${sub.status} | ${new Date(sub.created_at).toLocaleDateString()}`);
      console.log(`   ID: ${sub.id.slice(0, 8)}... | Source: ${sub.source}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking submissions:', error);
  }
}

async function processSubmissionWithEnhancedParser(submissionId) {
  try {
    console.log(`\n🔄 Processing submission ${submissionId.slice(0, 8)}... with enhanced parser`);
    
    // Get the submission
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching submission:', fetchError);
      return;
    }
    
    const data = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data;
    
    // Create a temporary file with the submission content
    const tempFile = path.join(__dirname, '..', 'data', 'temp', `submission_${submissionId.slice(0, 8)}.txt`);
    const tempDir = path.dirname(tempFile);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write submission content to temp file
    let content = '';
    if (submission.type === 'vulnerability') {
      content = `Vulnerability: ${data.vulnerability}\n`;
      content += `Discipline: ${data.discipline}\n`;
      content += `Sources: ${data.sources || 'N/A'}\n`;
      if (data.id) content += `ID: ${data.id}\n`;
    } else if (submission.type === 'ofc') {
      content = `Option for Consideration: ${data.option_text}\n`;
      content += `Discipline: ${data.discipline}\n`;
      content += `Sources: ${data.sources || 'N/A'}\n`;
      if (data.id) content += `ID: ${data.id}\n`;
    }
    
    fs.writeFileSync(tempFile, content);
    
    // Run enhanced parser on the temp file
    const enhancedParserPath = path.join(__dirname, '..', 'apps', 'backend', 'parsers', 'enhanced_parser.py');
    
    if (!fs.existsSync(enhancedParserPath)) {
      console.error('❌ Enhanced parser not found:', enhancedParserPath);
      return;
    }
    
    console.log('🐍 Running enhanced parser...');
    
    const python = spawn('python', [enhancedParserPath, tempFile, `Submission ${submissionId.slice(0, 8)}`], {
      cwd: path.dirname(enhancedParserPath)
    });
    
    let output = '';
    let error = '';
    
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    python.on('close', async (code) => {
      if (code === 0) {
        console.log('✅ Enhanced parser completed successfully');
        
        // Check if output file was created
        const outputFile = path.join(path.dirname(enhancedParserPath), 'parsed_enhanced.json');
        if (fs.existsSync(outputFile)) {
          try {
            const parsedResult = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
            console.log(`📊 Extracted ${parsedResult.length} content blocks`);
            
            // Update the submission with enhanced parsing results
            const enhancedData = {
              ...data,
              enhanced_extraction: parsedResult,
              parsed_at: new Date().toISOString(),
              parser_version: 'enhanced_v1.0'
            };
            
            const { error: updateError } = await supabase
              .from('submissions')
              .update({
                data: JSON.stringify(enhancedData),
                updated_at: new Date().toISOString()
              })
              .eq('id', submissionId);
            
            if (updateError) {
              console.error('❌ Error updating submission:', updateError);
            } else {
              console.log('✅ Submission updated with enhanced parsing results');
            }
            
          } catch (parseError) {
            console.error('❌ Error parsing enhanced parser output:', parseError);
          }
        }
      } else {
        console.error(`❌ Enhanced parser failed with code: ${code}`);
        if (error) console.error('Parser error:', error);
      }
      
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (cleanupError) {
        console.log('⚠️ Could not clean up temp file:', cleanupError.message);
      }
    });
    
  } catch (error) {
    console.error('❌ Error processing submission:', error);
  }
}

// Main execution
async function main() {
  await checkPendingSubmissions();
  
  console.log('\n🎯 Next Steps:');
  console.log('==============');
  console.log('1. Review the unprocessed submissions above');
  console.log('2. Run: node scripts/process-pending-submissions.js --process-all');
  console.log('3. Or process individual submissions by ID');
  console.log('4. Check the enhanced parsing results in the database');
}

// Handle command line arguments
if (process.argv.includes('--process-all')) {
  console.log('🚀 Processing all unprocessed submissions...');
  // This would process all unprocessed submissions
  // For now, just show the plan
  console.log('📋 This would process all unprocessed submissions with the enhanced parser');
} else {
  main();
}
