#!/usr/bin/env node

/**
 * Test script for local document storage system
 * Run with: node test-local-storage.js
 */

const fs = require('fs');
const path = require('path');

async function testLocalStorage() {
  console.log('🧪 Testing Local Document Storage System\n');

  // Test 1: Check upload directory
  const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
  console.log('1. Upload Directory Test');
  console.log(`   Directory: ${uploadDir}`);
  
  if (!fs.existsSync(uploadDir)) {
    console.log('   ❌ Directory does not exist');
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('   ✅ Directory created successfully');
    } catch (error) {
      console.log(`   ❌ Failed to create directory: ${error.message}`);
      return;
    }
  } else {
    console.log('   ✅ Directory exists');
  }

  // Test 2: Check write permissions
  console.log('\n2. Write Permissions Test');
  const testFile = path.join(uploadDir, 'test-write.txt');
  try {
    fs.writeFileSync(testFile, 'Test content for write permissions');
    console.log('   ✅ Write permissions OK');
    
    // Clean up test file
    fs.unlinkSync(testFile);
    console.log('   ✅ Test file cleaned up');
  } catch (error) {
    console.log(`   ❌ Write failed: ${error.message}`);
    return;
  }

  // Test 3: List existing files
  console.log('\n3. Existing Files Test');
  try {
    const files = fs.readdirSync(uploadDir);
    console.log(`   Found ${files.length} files:`);
    files.forEach(file => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`   - ${file} (${sizeKB}KB, ${stats.birthtime.toISOString()})`);
    });
  } catch (error) {
    console.log(`   ❌ Failed to list files: ${error.message}`);
  }

  // Test 4: API Endpoints Test
  console.log('\n4. API Endpoints Test');
  console.log('   Available endpoints:');
  console.log('   - POST /api/documents/submit (main submission)');
  console.log('   - POST /api/documents/upload-local (direct upload)');
  console.log('   - GET  /api/documents/serve?file=filename (serve file)');
  console.log('   - GET  /api/documents/list-local (list files)');
  console.log('   - GET  /api/debug/submission (diagnostics)');

  console.log('\n✅ Local storage system test completed!');
  console.log('\nNext steps:');
  console.log('1. Start your Next.js server: npm run dev');
  console.log('2. Test document submission at: http://localhost:3001/submit-psa');
  console.log('3. Check diagnostics at: http://localhost:3001/api/debug/submission');
  console.log('4. List uploaded files at: http://localhost:3001/api/documents/list-local');
}

// Run the test
testLocalStorage().catch(console.error);
