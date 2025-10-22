// PSA Document Submission API
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { runAgent } from "../../ollama/ollamaAgent.js";
import { createClient } from '@supabase/supabase-js';
import { spawn } from "child_process";

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "data", "docs");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.txt', '.html', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload PDF, DOCX, TXT, HTML, or XLSX files.'), false);
    }
  }
});

// Process document to staging
async function processDocumentToStaging(filePath, sourceTitle, uploadedBy, sourceMetadata = {}) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve("parsers/submission_generator.py");
    const args = [filePath, sourceTitle, uploadedBy];
    
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

// Submit document for processing
router.post("/submit", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded"
      });
    }

    const {
      source_title,
      source_type = 'unknown',
      source_url = '',
      author_org = '',
      publication_year,
      content_restriction = 'public'
    } = req.body;

    if (!source_title) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Source title is required"
      });
    }

    // Validate source type
    const validSourceTypes = ['government', 'academic', 'corporate', 'field_note', 'media', 'unknown'];
    if (!validSourceTypes.includes(source_type)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Invalid source type"
      });
    }

    // Validate content restriction
    const validRestrictions = ['public', 'restricted', 'confidential', 'classified'];
    if (!validRestrictions.includes(content_restriction)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Invalid content restriction level"
      });
    }

    // Validate publication year
    const year = parseInt(publication_year);
    const currentYear = new Date().getFullYear();
    if (year && (year < 1900 || year > currentYear)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Invalid publication year"
      });
    }

    // Create source metadata
    const source_metadata = {
      source_type,
      source_url: source_url || null,
      author_org: author_org || null,
      publication_year: year || null,
      content_restriction,
      submitted_by: req.user?.email || 'anonymous', // Get from auth if available
      submitted_at: new Date().toISOString()
    };

    // Start processing the document
    const filename = req.file.filename;
    const processingPath = req.file.path;

    console.log(`📄 PSA submitted document: ${filename}`);
    console.log(`📊 Source metadata:`, source_metadata);

    // Process document in background
    processPSADocumentAsync(filename, processingPath, source_metadata);

    res.json({
      success: true,
      message: "Document submitted successfully",
      filename,
      source_metadata,
      status: "processing"
    });

  } catch (error) {
    console.error('PSA submission error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get PSA submissions
router.get("/submissions", async (req, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    // This would typically query the database for user's submissions
    // For now, return a placeholder response
    res.json({
      success: true,
      submissions: [],
      message: "PSA submissions endpoint - implement database query"
    });

  } catch (error) {
    console.error('Error fetching PSA submissions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Background processing function for PSA documents
async function processPSADocumentAsync(filename, processingPath, source_metadata) {
  const startTime = Date.now();
  
  try {
    console.log(`🔄 Processing PSA document: ${filename}`);
    console.log(`📊 Source: ${source_metadata.source_type} - ${source_metadata.author_org}`);
    
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

    // Extract source title from metadata or filename
    const sourceTitle = source_metadata.source_title || filename.replace(/\.[^/.]+$/, '');
    const uploadedBy = source_metadata.submitted_by || 'anonymous';
    
    // Process document to staging
    console.log(`📄 Processing document to staging...`);
    const submissionPackage = await processDocumentToStaging(
      processingPath, 
      sourceTitle, 
      uploadedBy, 
      source_metadata
    );
    
    // Save to Supabase staging table
    console.log(`💾 Saving to staging table...`);
    const { data, error } = await supabase
      .from('vofc_submissions')
      .insert({
        data: submissionPackage,
        uploaded_by: uploadedBy,
        submission_metadata: {
          filename,
          source_metadata,
          processing_time_ms: Date.now() - startTime
        }
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save to staging: ${error.message}`);
    }
    
    console.log(`✅ PSA document processed and saved to staging`);
    console.log(`📋 Submission ID: ${data.id}`);
    console.log(`📊 Entries: ${submissionPackage.entries?.length || 0}`);
    console.log(`🏢 Source: ${submissionPackage.source?.title}`);
    
    // Move document to completed folder
    const completedDir = path.join("data/completed");
    if (!fs.existsSync(completedDir)) {
      fs.mkdirSync(completedDir, { recursive: true });
    }
    
    const completedPath = path.join(completedDir, filename);
    fs.renameSync(processingPath, completedPath);
    
    console.log(`✅ Completed PSA processing ${filename} in ${Date.now() - startTime}ms`);
    console.log(`📁 Document moved to: ${completedPath}`);

  } catch (error) {
    console.error(`❌ Error processing PSA document ${filename}:`, error);
    
    // Move to failed folder
    const failedDir = "data/failed";
    if (!fs.existsSync(failedDir)) {
      fs.mkdirSync(failedDir, { recursive: true });
    }
    
    const failedPath = path.join(failedDir, filename);
    try {
      fs.renameSync(processingPath, failedPath);
    } catch (moveError) {
      console.error(`Failed to move ${filename} to failed folder:`, moveError);
    }
    
    // Save error log with PSA metadata
    const errorLog = {
      filename,
      source_metadata,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      processing_time_ms: Date.now() - startTime,
      psa_submission: true
    };
    
    const errorFile = path.join(failedDir, `${filename}.error.json`);
    fs.writeFileSync(errorFile, JSON.stringify(errorLog, null, 2));
  }
}

export default router;
