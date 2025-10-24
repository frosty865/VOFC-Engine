import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Define the docs folder path
    const docsPath = path.join(process.cwd(), 'data', 'docs');
    
    // Check if docs folder exists
    if (!fs.existsSync(docsPath)) {
      return NextResponse.json({
        success: true,
        documents: []
      });
    }
    
    // Read directory contents
    const files = fs.readdirSync(docsPath);
    const documents = [];
    
    for (const file of files) {
      const filePath = path.join(docsPath, file);
      const stats = fs.statSync(filePath);
      
      // Only include files (not directories)
      if (stats.isFile()) {
        documents.push({
          filename: file,
          size: stats.size,
          modified: stats.mtime.toISOString()
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      documents: documents
    });
    
  } catch (error) {
    console.error('Error listing documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list documents' },
      { status: 500 }
    );
  }
}
