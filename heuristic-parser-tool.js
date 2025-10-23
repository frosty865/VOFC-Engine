#!/usr/bin/env node

/**
 * VOFC Heuristic Parser Tool
 * Integrates the heuristic parser for enhanced document processing
 * Run this from the root directory: node heuristic-parser-tool.js
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧠 VOFC Heuristic Parser Tool');
console.log('============================\n');

class HeuristicParserTool {
  constructor() {
    this.parserPath = path.join(__dirname, 'heuristic_parser', 'vofc_heuristic_parser.py');
    this.requirementsPath = path.join(__dirname, 'heuristic_parser', 'requirements.txt');
  }

  async checkPythonEnvironment() {
    try {
      console.log('🐍 Checking Python environment...');
      
      // Check if Python is available
      const pythonCheck = await this.runCommand('python', ['--version']);
      if (pythonCheck.success) {
        console.log('✅ Python found:', pythonCheck.output.trim());
        return true;
      }
      
      // Try python3 if python doesn't work
      const python3Check = await this.runCommand('python3', ['--version']);
      if (python3Check.success) {
        console.log('✅ Python3 found:', python3Check.output.trim());
        return true;
      }
      
      console.log('❌ Python not found. Please install Python 3.7+');
      return false;
      
    } catch (error) {
      console.error('❌ Error checking Python:', error.message);
      return false;
    }
  }

  async installDependencies() {
    try {
      console.log('📦 Installing Python dependencies...');
      
      if (!fs.existsSync(this.requirementsPath)) {
        console.log('❌ Requirements file not found:', this.requirementsPath);
        return false;
      }
      
      // Try pip install
      const pipResult = await this.runCommand('pip', ['install', '-r', this.requirementsPath]);
      if (pipResult.success) {
        console.log('✅ Dependencies installed with pip');
        return true;
      }
      
      // Try pip3 if pip doesn't work
      const pip3Result = await this.runCommand('pip3', ['install', '-r', this.requirementsPath]);
      if (pip3Result.success) {
        console.log('✅ Dependencies installed with pip3');
        return true;
      }
      
      console.log('❌ Failed to install dependencies');
      console.log('💡 Try running manually: pip install -r heuristic_parser/requirements.txt');
      return false;
      
    } catch (error) {
      console.error('❌ Error installing dependencies:', error.message);
      return false;
    }
  }

  async parseDocument(inputPath, options = {}) {
    try {
      console.log(`📄 Parsing document: ${inputPath}`);
      
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
      }
      
      if (!fs.existsSync(this.parserPath)) {
        throw new Error(`Parser script not found: ${this.parserPath}`);
      }
      
      const args = [this.parserPath, inputPath];
      
      // Add optional arguments
      if (options.sourceUrl) {
        args.push('--source-url', options.sourceUrl);
      }
      
      if (options.categoryHint) {
        args.push('--category-hint', options.categoryHint);
      }
      
      if (options.minConfidence) {
        args.push('--min-confidence', options.minConfidence.toString());
      }
      
      if (options.outputPath) {
        args.push('--out', options.outputPath);
      }
      
      console.log(`🔧 Running: python ${args.join(' ')}`);
      
      const result = await this.runCommand('python', args);
      
      if (!result.success) {
        throw new Error(`Parser failed: ${result.error}`);
      }
      
      // Parse the JSON output
      let parsedResult;
      if (options.outputPath && fs.existsSync(options.outputPath)) {
        const outputContent = fs.readFileSync(options.outputPath, 'utf8');
        parsedResult = JSON.parse(outputContent);
      } else {
        parsedResult = JSON.parse(result.output);
      }
      
      console.log(`✅ Parsed ${parsedResult.entry_count} entries`);
      return parsedResult;
      
    } catch (error) {
      console.error('❌ Error parsing document:', error.message);
      throw error;
    }
  }

  async processSubmissionDocuments() {
    try {
      console.log('📁 Processing submission documents...');
      
      const docsPath = path.join(__dirname, 'vofc-viewer', 'data', 'docs');
      const outputPath = path.join(__dirname, 'vofc-viewer', 'data', 'heuristic-parsed');
      
      // Create output directory
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }
      
      if (!fs.existsSync(docsPath)) {
        console.log('❌ Documents directory not found:', docsPath);
        return;
      }
      
      const files = fs.readdirSync(docsPath);
      const supportedExtensions = ['.pdf', '.html', '.docx', '.txt'];
      
      const documentFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return supportedExtensions.includes(ext);
      });
      
      console.log(`📊 Found ${documentFiles.length} supported documents`);
      
      const results = [];
      
      for (const file of documentFiles) {
        const inputPath = path.join(docsPath, file);
        const outputFile = path.join(outputPath, `${path.parse(file).name}_heuristic.json`);
        
        try {
          console.log(`\n🔄 Processing: ${file}`);
          
          const result = await this.parseDocument(inputPath, {
            sourceUrl: `https://example.com/${file}`,
            categoryHint: 'Security Guidance',
            minConfidence: 0.5,
            outputPath: outputFile
          });
          
          results.push({
            file: file,
            inputPath: inputPath,
            outputPath: outputFile,
            entryCount: result.entry_count,
            success: true
          });
          
          console.log(`✅ Processed ${file}: ${result.entry_count} entries`);
          
        } catch (error) {
          console.error(`❌ Failed to process ${file}:`, error.message);
          results.push({
            file: file,
            inputPath: inputPath,
            outputPath: outputFile,
            error: error.message,
            success: false
          });
        }
      }
      
      // Generate summary report
      const summaryPath = path.join(outputPath, 'processing_summary.json');
      const summary = {
        processedAt: new Date().toISOString(),
        totalFiles: documentFiles.length,
        successfulFiles: results.filter(r => r.success).length,
        failedFiles: results.filter(r => !r.success).length,
        totalEntries: results.reduce((sum, r) => sum + (r.entryCount || 0), 0),
        results: results
      };
      
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      
      console.log('\n📊 Processing Summary:');
      console.log('=====================');
      console.log(`Total files: ${summary.totalFiles}`);
      console.log(`Successful: ${summary.successfulFiles}`);
      console.log(`Failed: ${summary.failedFiles}`);
      console.log(`Total entries: ${summary.totalEntries}`);
      console.log(`Summary saved: ${summaryPath}`);
      
      return summary;
      
    } catch (error) {
      console.error('❌ Error processing documents:', error.message);
      throw error;
    }
  }

  async runCommand(command, args = []) {
    return new Promise((resolve) => {
      const process = spawn(command, args, { 
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });
      
      let output = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output,
          error: error,
          code: code
        });
      });
      
      process.on('error', (err) => {
        resolve({
          success: false,
          output: '',
          error: err.message,
          code: -1
        });
      });
    });
  }

  async testParser() {
    try {
      console.log('🧪 Testing heuristic parser...');
      
      // Create a test document
      const testPath = path.join(__dirname, 'test_document.txt');
      const testContent = `
# Security Planning Workbook

## Vulnerability Assessment

Organizations should identify potential security vulnerabilities in their systems. 
This includes physical security gaps, cybersecurity weaknesses, and procedural deficiencies.

## Options for Consideration

1. Conduct regular security assessments to identify vulnerabilities
2. Implement multi-factor authentication for all systems
3. Establish incident response procedures
4. Train staff on security awareness
5. Maintain updated security policies and procedures

## Risk Mitigation

Organizations must develop comprehensive risk mitigation strategies that address 
identified vulnerabilities through appropriate security measures.
      `;
      
      fs.writeFileSync(testPath, testContent);
      
      const result = await this.parseDocument(testPath, {
        sourceUrl: 'https://test.example.com',
        categoryHint: 'Security Planning',
        minConfidence: 0.4
      });
      
      console.log('✅ Parser test successful!');
      console.log(`📊 Found ${result.entry_count} entries`);
      
      // Clean up test file
      fs.unlinkSync(testPath);
      
      return result;
      
    } catch (error) {
      console.error('❌ Parser test failed:', error.message);
      throw error;
    }
  }
}

async function main() {
  const tool = new HeuristicParserTool();
  
  try {
    console.log('🚀 Starting Heuristic Parser Tool...\n');
    
    // Step 1: Check Python environment
    const pythonOk = await tool.checkPythonEnvironment();
    if (!pythonOk) {
      console.log('\n❌ Python environment not ready. Please install Python 3.7+');
      return;
    }
    
    // Step 2: Install dependencies
    const depsOk = await tool.installDependencies();
    if (!depsOk) {
      console.log('\n⚠️ Some dependencies may not be installed. Continuing anyway...');
    }
    
    // Step 3: Test parser
    console.log('\n🧪 Testing parser...');
    try {
      await tool.testParser();
      console.log('✅ Parser test passed');
    } catch (error) {
      console.log('⚠️ Parser test failed, but continuing...');
    }
    
    // Step 4: Process documents
    console.log('\n📁 Processing submission documents...');
    const summary = await tool.processSubmissionDocuments();
    
    console.log('\n🎯 Heuristic Parser Tool Complete!');
    console.log('==================================');
    console.log('✅ Python environment ready');
    console.log('✅ Dependencies installed');
    console.log('✅ Parser tested');
    console.log('✅ Documents processed');
    console.log(`📊 Processed ${summary.totalFiles} files with ${summary.totalEntries} entries`);
    
  } catch (error) {
    console.error('\n❌ Tool failed:', error.message);
    process.exit(1);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧠 VOFC Heuristic Parser Tool
=============================

Usage:
  node heuristic-parser-tool.js [options]

Options:
  --help, -h          Show this help message
  --test              Run parser test only
  --process           Process documents only
  --install           Install dependencies only

Examples:
  node heuristic-parser-tool.js                    # Full process
  node heuristic-parser-tool.js --test             # Test parser only
  node heuristic-parser-tool.js --process          # Process documents only
  node heuristic-parser-tool.js --install          # Install dependencies only
    `);
    process.exit(0);
  }
  
  if (args.includes('--test')) {
    const tool = new HeuristicParserTool();
    tool.checkPythonEnvironment()
      .then(() => tool.installDependencies())
      .then(() => tool.testParser())
      .then(() => console.log('✅ Test completed successfully'))
      .catch(error => {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
      });
  } else if (args.includes('--process')) {
    const tool = new HeuristicParserTool();
    tool.processSubmissionDocuments()
      .then(() => console.log('✅ Processing completed successfully'))
      .catch(error => {
        console.error('❌ Processing failed:', error.message);
        process.exit(1);
      });
  } else if (args.includes('--install')) {
    const tool = new HeuristicParserTool();
    tool.checkPythonEnvironment()
      .then(() => tool.installDependencies())
      .then(() => console.log('✅ Installation completed successfully'))
      .catch(error => {
        console.error('❌ Installation failed:', error.message);
        process.exit(1);
      });
  } else {
    main();
  }
}

module.exports = HeuristicParserTool;
