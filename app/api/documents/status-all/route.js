import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const basePath = path.join(process.cwd(), 'data');
    const folders = ['docs', 'processing', 'completed', 'failed'];
    
    const status = {};
    
    // Get file counts and details for each folder
    for (const folder of folders) {
      const folderPath = path.join(basePath, folder);
      if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath);
        status[folder] = {
          count: files.length,
          files: files.slice(0, 10).map(file => {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);
            return {
              filename: file,
              name: file, // Keep both for compatibility
              size: stats.size,
              modified: stats.mtime.toISOString()
            };
          })
        };
      } else {
        status[folder] = { count: 0, files: [] };
      }
    }

    // Get processing status
    const processingPath = path.join(basePath, 'processing');
    let processingStatuses = [];
    
    if (fs.existsSync(processingPath)) {
      const files = fs.readdirSync(processingPath);
      processingStatuses = files.map(file => {
        const filePath = path.join(processingPath, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          status: 'processing',
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      });
    }

    return NextResponse.json({
      success: true,
      documents: status.docs.files,
      processing: processingStatuses,
      completed: status.completed.files,
      failed: status.failed.files,
      summary: {
        docs: status.docs.count,
        processing: status.processing.count,
        completed: status.completed.count,
        failed: status.failed.count
      }
    });
    
  } catch (error) {
    console.error('Error getting consolidated document status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get document status' },
      { status: 500 }
    );
  }
}
