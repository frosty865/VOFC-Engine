import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const { filenames } = await request.json();
    
    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Filenames array is required' },
        { status: 400 }
      );
    }
    
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
    
    const results = [];
    
    for (const filename of filenames) {
      const sourceFile = path.join(docsPath, filename);
      const processingFile = path.join(processingPath, filename);
      
      try {
        // Check if source file exists
        if (!fs.existsSync(sourceFile)) {
          results.push({ filename, status: 'error', message: 'Source file not found' });
          continue;
        }
        
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
    console.error('Error processing batch:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process batch' },
      { status: 500 }
    );
  }
}
