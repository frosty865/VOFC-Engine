import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    // Define paths
    const docsPath = path.join(process.cwd(), 'data', 'docs');
    const processingPath = path.join(process.cwd(), 'data', 'processing');
    const completedPath = path.join(process.cwd(), 'data', 'completed');
    const failedPath = path.join(process.cwd(), 'data', 'failed');
    
    // Create directories if they don't exist
    [processingPath, completedPath, failedPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Check if docs folder exists
    if (!fs.existsSync(docsPath)) {
      return NextResponse.json({
        success: true,
        message: 'No documents to process',
        results: []
      });
    }
    
    // Get all files in docs folder
    const files = fs.readdirSync(docsPath);
    const documentFiles = files.filter(file => {
      const filePath = path.join(docsPath, file);
      return fs.statSync(filePath).isFile();
    });
    
    if (documentFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No documents to process',
        results: []
      });
    }
    
    const results = [];
    
    for (const filename of documentFiles) {
      const sourceFile = path.join(docsPath, filename);
      const processingFile = path.join(processingPath, filename);
      
      try {
        // Move file to processing folder
        fs.renameSync(sourceFile, processingFile);
        
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Move to completed folder
        const completedFile = path.join(completedPath, filename);
        fs.renameSync(processingFile, completedFile);
        
        results.push({ filename, status: 'success', message: 'Processed successfully' });
        
      } catch (error) {
        // If processing fails, move to failed folder
        const failedFile = path.join(failedPath, filename);
        if (fs.existsSync(processingFile)) {
          fs.renameSync(processingFile, failedFile);
        }
        
        results.push({ filename, status: 'error', message: error.message });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    return NextResponse.json({
      success: true,
      message: `Processed ${successCount} documents successfully, ${errorCount} failed`,
      results: results
    });
    
  } catch (error) {
    console.error('Error processing all documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process all documents' },
      { status: 500 }
    );
  }
}
