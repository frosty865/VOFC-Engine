// Document processing API routes
import express from "express";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { runAgent } from "../../ollama/ollamaAgent.js";

const router = express.Router();

// Document processing status tracking
const processingStatus = new Map();

// Ensure required directories exist
const DOCS_DIR = path.join(process.cwd(), "data", "docs");
const PROCESSING_DIR = path.join(process.cwd(), "data", "processing");
const COMPLETED_DIR = path.join(process.cwd(), "data", "completed");
const FAILED_DIR = path.join(process.cwd(), "data", "failed");

[DOCS_DIR, PROCESSING_DIR, COMPLETED_DIR, FAILED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Get list of documents in docs folder
router.get("/list", (req, res) => {
  try {
    const files = fs.readdirSync(DOCS_DIR)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.pdf', '.docx', '.txt', '.html', '.xlsx'].includes(ext);
      })
      .map(file => {
        const filePath = path.join(DOCS_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          modified: stats.mtime,
          status: processingStatus.get(file) || 'pending'
        };
      });

    res.json({
      success: true,
      documents: files,
      total: files.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start processing a document
router.post("/process", async (req, res) => {
  const { filename, options = {}, source_metadata = {} } = req.body;
  
  if (!filename) {
    return res.status(400).json({
      success: false,
      error: "Filename is required"
    });
  }

  const sourcePath = path.join(DOCS_DIR, filename);
  
  if (!fs.existsSync(sourcePath)) {
    return res.status(404).json({
      success: false,
      error: "Document not found"
    });
  }

  // Check if already processing
  if (processingStatus.get(filename) === 'processing') {
    return res.status(409).json({
      success: false,
      error: "Document is already being processed"
    });
  }

  try {
    // Mark as processing
    processingStatus.set(filename, 'processing');
    
    // Move to processing directory
    const processingPath = path.join(PROCESSING_DIR, filename);
    fs.renameSync(sourcePath, processingPath);

    // Start processing in background with source metadata
    processDocumentAsync(filename, processingPath, { ...options, source_metadata });

    res.json({
      success: true,
      message: `Started processing ${filename}`,
      filename,
      status: 'processing',
      source_metadata
    });

  } catch (error) {
    processingStatus.set(filename, 'failed');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process multiple documents
router.post("/process-batch", async (req, res) => {
  const { filenames, options = {} } = req.body;
  
  if (!filenames || !Array.isArray(filenames)) {
    return res.status(400).json({
      success: false,
      error: "Filenames array is required"
    });
  }

  const results = [];
  
  for (const filename of filenames) {
    try {
      const sourcePath = path.join(DOCS_DIR, filename);
      
      if (!fs.existsSync(sourcePath)) {
        results.push({
          filename,
          success: false,
          error: "Document not found"
        });
        continue;
      }

      if (processingStatus.get(filename) === 'processing') {
        results.push({
          filename,
          success: false,
          error: "Already processing"
        });
        continue;
      }

      // Mark as processing
      processingStatus.set(filename, 'processing');
      
      // Move to processing directory
      const processingPath = path.join(PROCESSING_DIR, filename);
      fs.renameSync(sourcePath, processingPath);

      // Start processing in background
      processDocumentAsync(filename, processingPath, options);

      results.push({
        filename,
        success: true,
        status: 'processing'
      });

    } catch (error) {
      processingStatus.set(filename, 'failed');
      results.push({
        filename,
        success: false,
        error: error.message
      });
    }
  }

  res.json({
    success: true,
    message: `Started processing ${results.length} documents`,
    results
  });
});

// Get processing status
router.get("/status/:filename", (req, res) => {
  const { filename } = req.params;
  const status = processingStatus.get(filename);
  
  if (!status) {
    return res.status(404).json({
      success: false,
      error: "Document not found or not processed"
    });
  }

  res.json({
    success: true,
    filename,
    status,
    timestamp: new Date().toISOString()
  });
});

// Get all processing statuses
router.get("/status", (req, res) => {
  const statuses = Array.from(processingStatus.entries()).map(([filename, status]) => ({
    filename,
    status,
    timestamp: new Date().toISOString()
  }));

  res.json({
    success: true,
    statuses,
    total: statuses.length
  });
});

// Get completed documents
router.get("/completed", (req, res) => {
  try {
    const files = fs.readdirSync(COMPLETED_DIR)
      .map(file => {
        const filePath = path.join(COMPLETED_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          completed: stats.mtime
        };
      });

    res.json({
      success: true,
      documents: files,
      total: files.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get failed documents
router.get("/failed", (req, res) => {
  try {
    const files = fs.readdirSync(FAILED_DIR)
      .map(file => {
        const filePath = path.join(FAILED_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          failed: stats.mtime
        };
      });

    res.json({
      success: true,
      documents: files,
      total: files.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Retry failed document
router.post("/retry/:filename", async (req, res) => {
  const { filename } = req.params;
  const sourcePath = path.join(FAILED_DIR, filename);
  
  if (!fs.existsSync(sourcePath)) {
    return res.status(404).json({
      success: false,
      error: "Failed document not found"
    });
  }

  try {
    // Move back to docs directory
    const docsPath = path.join(DOCS_DIR, filename);
    fs.renameSync(sourcePath, docsPath);

    // Clear status
    processingStatus.delete(filename);

    res.json({
      success: true,
      message: `Document ${filename} moved back to docs folder for retry`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete completed document
router.delete("/completed/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(COMPLETED_DIR, filename);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: `Document ${filename} deleted`
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Document not found"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process document to staging
async function processDocumentToStaging(filename, processingPath, uploadedBy, sourceMetadata = {}) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve("parsers/submission_generator.py");
    const args = [processingPath, filename, uploadedBy];
    
    // Add metadata as JSON string if provided
    if (Object.keys(sourceMetadata).length > 0) {
      args.push(JSON.stringify(sourceMetadata));
    }
    
    const proc = spawn("python", [scriptPath, ...args]);
    let output = "";
    let errorOutput = "";
    
    proc.stdout.on("data", (data) => {
      output += data.toString();
    });
    
    proc.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });
    
    proc.on("close", (code) => {
      if (code === 0) {
        try {
          // Try to parse the output as JSON
          const result = JSON.parse(output);
          resolve(result);
        } catch (e) {
          // If not JSON, return the raw output
          resolve({ output: output.trim() });
        }
      } else {
        reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
      }
    });
    
    proc.on("error", (error) => {
      reject(error);
    });
  });
}

// Background document processing function
async function processDocumentAsync(filename, processingPath, options) {
  const startTime = Date.now();
  const { source_metadata = {} } = options;
  
  try {
    console.log(`🔄 Processing document: ${filename}`);
    console.log(`📊 Source metadata:`, source_metadata);
    
    // Determine document type and processing method
    const ext = path.extname(filename).toLowerCase();
    let processingMethod;
    
    switch (ext) {
      case '.pdf':
        processingMethod = 'parse_universal';
        break;
      case '.docx':
      case '.txt':
        processingMethod = 'parse_universal';
        break;
      case '.html':
        processingMethod = 'parse_universal';
        break;
      case '.xlsx':
        processingMethod = 'parse_universal';
        break;
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }

    // Step 1: Parse document with source metadata
    console.log(`📄 Parsing ${filename} with source metadata...`);
    const parseCommand = `Parse the document ${filename} using ${processingMethod} with source metadata: ${JSON.stringify(source_metadata)}`;
    const parseResult = await runAgent(parseCommand);
    
    // Step 2: Normalize with universal normalization
    console.log(`🔧 Normalizing ${filename}...`);
    const normalizeResult = await runAgent(`Normalize the parsed data from ${filename} using normalize_universal`);
    
    // Step 3: Generate output files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(COMPLETED_DIR, filename.replace(/\.[^/.]+$/, ''));
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save processing results with source metadata
    const resultsFile = path.join(outputDir, `processing_results_${timestamp}.json`);
    const processingResults = {
      filename,
      source_metadata,
      processing_started: new Date(startTime).toISOString(),
      processing_completed: new Date().toISOString(),
      processing_time_ms: Date.now() - startTime,
      method: processingMethod,
      parse_result: parseResult,
      normalize_result: normalizeResult,
      options
    };

    fs.writeFileSync(resultsFile, JSON.stringify(processingResults, null, 2));

    // Move document to completed folder
    const completedPath = path.join(outputDir, filename);
    fs.renameSync(processingPath, completedPath);

    // Update status
    processingStatus.set(filename, 'completed');
    
    console.log(`✅ Completed processing ${filename} in ${Date.now() - startTime}ms`);
    console.log(`📁 Results saved to: ${outputDir}`);
    console.log(`🏢 Source type: ${source_metadata.source_type || 'unknown'}`);

  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error);
    
    // Move to failed folder
    const failedPath = path.join(FAILED_DIR, filename);
    try {
      fs.renameSync(processingPath, failedPath);
    } catch (moveError) {
      console.error(`Failed to move ${filename} to failed folder:`, moveError);
    }

    // Update status
    processingStatus.set(filename, 'failed');
    
    // Save error log with source metadata
    const errorLog = {
      filename,
      source_metadata,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      processing_time_ms: Date.now() - startTime
    };
    
    const errorFile = path.join(FAILED_DIR, `${filename}.error.json`);
    fs.writeFileSync(errorFile, JSON.stringify(errorLog, null, 2));
  }
}

// Process all pending documents
router.post("/process-all", async (req, res) => {
  try {
    const files = fs.readdirSync(DOCS_DIR)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.pdf', '.docx', '.txt', '.html', '.xlsx'].includes(ext);
      });

    if (files.length === 0) {
      return res.json({
        success: true,
        message: "No documents to process",
        processed: 0
      });
    }

    // Process all files
    const results = [];
    for (const filename of files) {
      try {
        const sourcePath = path.join(DOCS_DIR, filename);
        const processingPath = path.join(PROCESSING_DIR, filename);
        
        fs.renameSync(sourcePath, processingPath);
        processingStatus.set(filename, 'processing');
        
        processDocumentAsync(filename, processingPath, req.body.options || {});
        
        results.push({
          filename,
          success: true,
          status: 'processing'
        });
      } catch (error) {
        results.push({
          filename,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Started processing ${results.length} documents`,
      results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
