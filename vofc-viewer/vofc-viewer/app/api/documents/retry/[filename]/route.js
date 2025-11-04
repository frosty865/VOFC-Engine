import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request, { params }) {
  try {
    const { filename } = params;
    
    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }
    
    // Define paths
    const failedPath = path.join(process.cwd(), 'data', 'failed');
    const processingPath = path.join(process.cwd(), 'data', 'processing');
    const completedPath = path.join(process.cwd(), 'data', 'completed');
    
    // Create directories if they don't exist
    [processingPath, completedPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    const sourceFile = path.join(failedPath, filename);
    const processingFile = path.join(processingPath, filename);
    
    // Check if failed file exists
    if (!fs.existsSync(sourceFile)) {
      return NextResponse.json(
        { success: false, error: 'Failed file not found' },
        { status: 404 }
      );
    }
    
    try {
      // Move file from failed to processing folder
      fs.renameSync(sourceFile, processingFile);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Move to completed folder
      const completedFile = path.join(completedPath, filename);
      fs.renameSync(processingFile, completedFile);
      
      return NextResponse.json({
        success: true,
        message: `Document ${filename} retried and processed successfully`
      });
      
    } catch (processError) {
      // If processing fails again, move back to failed folder
      const failedFile = path.join(failedPath, filename);
      if (fs.existsSync(processingFile)) {
        fs.renameSync(processingFile, failedFile);
      }
      
      return NextResponse.json(
        { success: false, error: `Retry failed: ${processError.message}` },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error retrying document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retry document' },
      { status: 500 }
    );
  }
}
