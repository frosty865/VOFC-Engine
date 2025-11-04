import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Define the failed folder path
    const failedPath = path.join(process.cwd(), 'data', 'failed');
    
    // Check if failed folder exists
    if (!fs.existsSync(failedPath)) {
      return NextResponse.json({
        success: true,
        documents: []
      });
    }
    
    // Read directory contents
    const files = fs.readdirSync(failedPath);
    const documents = [];
    
    for (const file of files) {
      const filePath = path.join(failedPath, file);
      const stats = fs.statSync(filePath);
      
      // Only include files (not directories)
      if (stats.isFile()) {
        documents.push({
          filename: file,
          size: stats.size,
          failed: stats.mtime.toISOString()
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      documents: documents
    });
    
  } catch (error) {
    console.error('Error listing failed documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list failed documents' },
      { status: 500 }
    );
  }
}
