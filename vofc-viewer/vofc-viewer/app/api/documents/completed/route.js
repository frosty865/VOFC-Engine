import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Define the completed folder path
    const completedPath = path.join(process.cwd(), 'data', 'completed');
    
    // Check if completed folder exists
    if (!fs.existsSync(completedPath)) {
      return NextResponse.json({
        success: true,
        documents: []
      });
    }
    
    // Read directory contents
    const files = fs.readdirSync(completedPath);
    const documents = [];
    
    for (const file of files) {
      const filePath = path.join(completedPath, file);
      const stats = fs.statSync(filePath);
      
      // Only include files (not directories)
      if (stats.isFile()) {
        documents.push({
          filename: file,
          size: stats.size,
          completed: stats.mtime.toISOString()
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      documents: documents
    });
    
  } catch (error) {
    console.error('Error listing completed documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list completed documents' },
      { status: 500 }
    );
  }
}
