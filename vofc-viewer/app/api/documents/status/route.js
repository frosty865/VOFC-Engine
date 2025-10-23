import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Define the processing folder path
    const processingPath = path.join(process.cwd(), 'data', 'processing');
    
    // Check if processing folder exists
    if (!fs.existsSync(processingPath)) {
      return NextResponse.json({
        success: true,
        statuses: []
      });
    }
    
    // Read directory contents
    const files = fs.readdirSync(processingPath);
    const statuses = [];
    
    for (const file of files) {
      const filePath = path.join(processingPath, file);
      const stats = fs.statSync(filePath);
      
      // Only include files (not directories)
      if (stats.isFile()) {
        statuses.push({
          filename: file,
          status: 'processing',
          timestamp: stats.mtime.toISOString()
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      statuses: statuses
    });
    
  } catch (error) {
    console.error('Error getting processing status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get processing status' },
      { status: 500 }
    );
  }
}
