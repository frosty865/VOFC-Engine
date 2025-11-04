#!/usr/bin/env node

/**
 * Process all pending submissions with the enhanced parser
 * This script will download, parse, and update all unprocessed submissions
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

console.log('🚀 Processing all pending submissions with enhanced parser...');
console.log('============================================================\n');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const file = fs.createWriteStream(filePath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(filePath);
        });
      } else {
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

async function processSubmissionWithEnhancedParser(submission) {
  try {
    console.log(`\n🔄 Processing submission ${submission.id.slice(0, 8)}...`);
    console.log(`   Type: ${submission.type}`);
    console.log(`   Status: ${submission.status}`);
    
    const data = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data;
    
    console.log(`   Source: ${data.source_title || 'Unknown'}`);
    console.log(`   URL: ${data.source_url || 'N/A'}`);
    
    // Create temp directory
    const tempDir = path.join(__dirname, '..', 'data', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    let filePath;
    let fileName;
    
    // Handle different submission types
    if (data.source_url && (data.source_url.includes('.pdf') || data.source_url.includes('.txt'))) {
      // Download the file
      fileName = path.basename(data.source_url) || `submission_${submission.id.slice(0, 8)}.pdf`;
      filePath = path.join(tempDir, fileName);
      
      console.log(`   📥 Downloading file from: ${data.source_url}`);
      try {
        await downloadFile(data.source_url, filePath);
        console.log(`   ✅ Downloaded to: ${filePath}`);
      } catch (downloadError) {
        console.log(`   ⚠️ Download failed: ${downloadError.message}`);
        console.log(`   📝 Creating text file from submission data instead...`);
        
        // Create text file from submission data
        fileName = `submission_${submission.id.slice(0, 8)}.txt`;
        filePath = path.join(tempDir, fileName);
        
        let content = `Source: ${data.source_title || 'Unknown Document'}\n`;
        content += `URL: ${data.source_url || 'N/A'}\n`;
        content += `Type: ${submission.type}\n\n`;
        
        if (submission.type === 'vulnerability') {
          content += `Vulnerability: ${data.vulnerability}\n`;
          content += `Discipline: ${data.discipline}\n`;
          content += `Sources: ${data.sources || 'N/A'}\n`;
          if (data.id) content += `ID: ${data.id}\n`;
        } else if (submission.type === 'ofc') {
          content += `Option for Consideration: ${data.option_text}\n`;
          content += `Discipline: ${data.discipline}\n`;
          content += `Sources: ${data.sources || 'N/A'}\n`;
          if (data.id) content += `ID: ${data.id}\n`;
        }
        
        fs.writeFileSync(filePath, content);
        console.log(`   ✅ Created text file: ${filePath}`);
      }
    } else {
      // Create text file from submission data
      fileName = `submission_${submission.id.slice(0, 8)}.txt`;
      filePath = path.join(tempDir, fileName);
      
      let content = `Source: ${data.source_title || 'Unknown Document'}\n`;
      content += `URL: ${data.source_url || 'N/A'}\n`;
      content += `Type: ${submission.type}\n\n`;
      
      if (submission.type === 'vulnerability') {
        content += `Vulnerability: ${data.vulnerability}\n`;
        content += `Discipline: ${data.discipline}\n`;
        content += `Sources: ${data.sources || 'N/A'}\n`;
        if (data.id) content += `ID: ${data.id}\n`;
      } else if (submission.type === 'ofc') {
        content += `Option for Consideration: ${data.option_text}\n`;
        content += `Discipline: ${data.discipline}\n`;
        content += `Sources: ${data.sources || 'N/A'}\n`;
        if (data.id) content += `ID: ${data.id}\n`;
      }
      
      fs.writeFileSync(filePath, content);
      console.log(`   ✅ Created text file: ${filePath}`);
    }
    
    // Run enhanced parser
    const enhancedParserPath = path.join(__dirname, '..', 'apps', 'backend', 'parsers', 'enhanced_parser.py');
    
    if (!fs.existsSync(enhancedParserPath)) {
      console.error('   ❌ Enhanced parser not found:', enhancedParserPath);
      return false;
    }
    
    console.log(`   🐍 Running enhanced parser on: ${fileName}`);
    
    const python = spawn('python', [enhancedParserPath, filePath, data.source_title || 'Submission Document'], {
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
    
    return new Promise((resolve) => {
      python.on('close', async (code) => {
        if (code === 0) {
          console.log('   ✅ Enhanced parser completed successfully');
          
          // Check if output file was created
          const outputFile = path.join(path.dirname(enhancedParserPath), 'parsed_enhanced.json');
          if (fs.existsSync(outputFile)) {
            try {
              const parsedResult = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
              console.log(`   📊 Extracted ${parsedResult.length} content blocks`);
              
              // Count OFCs and vulnerabilities
              let ofcCount = 0;
              let vulnCount = 0;
              
              parsedResult.forEach(record => {
                if (record.content) {
                  record.content.forEach(entry => {
                    if (entry.type === 'ofc') ofcCount++;
                    if (entry.type === 'vulnerability') vulnCount++;
                  });
                }
              });
              
              console.log(`   📊 OFCs found: ${ofcCount}`);
              console.log(`   📊 Vulnerabilities found: ${vulnCount}`);
              
              // Update the submission with enhanced parsing results
              const enhancedData = {
                ...data,
                enhanced_extraction: parsedResult,
                parsed_at: new Date().toISOString(),
                parser_version: 'enhanced_v1.0',
                extraction_stats: {
                  total_blocks: parsedResult.length,
                  ofc_count: ofcCount,
                  vulnerability_count: vulnCount
                }
              };
              
              const { error: updateError } = await supabase
                .from('submissions')
                .update({
                  data: JSON.stringify(enhancedData),
                  updated_at: new Date().toISOString()
                })
                .eq('id', submission.id);
              
              if (updateError) {
                console.error('   ❌ Error updating submission:', updateError);
                resolve(false);
              } else {
                console.log('   ✅ Submission updated with enhanced parsing results');
                resolve(true);
              }
              
            } catch (parseError) {
              console.error('   ❌ Error parsing enhanced parser output:', parseError);
              resolve(false);
            }
          } else {
            console.log('   ⚠️ No output file created by enhanced parser');
            resolve(false);
          }
        } else {
          console.error(`   ❌ Enhanced parser failed with code: ${code}`);
          if (error) console.error('   Parser error:', error);
          resolve(false);
        }
        
        // Clean up temp file
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.log('   ⚠️ Could not clean up temp file:', cleanupError.message);
        }
      });
    });
    
  } catch (error) {
    console.error(`❌ Error processing submission ${submission.id.slice(0, 8)}:`, error);
    return false;
  }
}

async function processAllSubmissions() {
  try {
    console.log('📊 Fetching all submissions from database...');
    
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
    
    // Find unprocessed submissions
    const unprocessed = submissions.filter(s => {
      const data = typeof s.data === 'string' ? JSON.parse(s.data) : s.data;
      return !data.enhanced_extraction || !data.parsed_at;
    });
    
    console.log(`🔍 Unprocessed submissions: ${unprocessed.length}`);
    
    if (unprocessed.length === 0) {
      console.log('✅ All submissions have been processed!');
      return;
    }
    
    console.log('\n📝 Processing submissions:');
    unprocessed.forEach((sub, idx) => {
      const data = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;
      console.log(`${idx + 1}. ${sub.type} | ${sub.status} | ${data.source_title || 'Unknown'}`);
    });
    
    console.log('\n🚀 Starting batch processing...');
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < unprocessed.length; i++) {
      const submission = unprocessed[i];
      console.log(`\n📄 Processing ${i + 1}/${unprocessed.length}: ${submission.id.slice(0, 8)}...`);
      
      const success = await processSubmissionWithEnhancedParser(submission);
      
      if (success) {
        successCount++;
        console.log(`✅ Successfully processed submission ${i + 1}/${unprocessed.length}`);
      } else {
        failCount++;
        console.log(`❌ Failed to process submission ${i + 1}/${unprocessed.length}`);
      }
    }
    
    console.log('\n🎯 Processing Complete!');
    console.log('======================');
    console.log(`✅ Successfully processed: ${successCount}`);
    console.log(`❌ Failed to process: ${failCount}`);
    console.log(`📊 Total submissions: ${unprocessed.length}`);
    
    if (successCount > 0) {
      console.log('\n🎉 Enhanced parsing results have been saved to the database!');
      console.log('   You can now review the submissions in the admin panel.');
    }
    
  } catch (error) {
    console.error('❌ Error processing submissions:', error);
  }
}

// Run the processing
processAllSubmissions();
