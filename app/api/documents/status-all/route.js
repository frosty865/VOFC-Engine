import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    console.log('🔍 /api/documents/status-all called');
    
    // Get local storage paths
    const incomingDir = process.env.OLLAMA_INCOMING_PATH || 'C:\\Users\\frost\\AppData\\Local\\Ollama\\files\\incoming';
    const processedDir = process.env.OLLAMA_PROCESSED_PATH || 'C:\\Users\\frost\\AppData\\Local\\Ollama\\files\\processed';
    const errorDir = process.env.OLLAMA_ERROR_PATH || 'C:\\Users\\frost\\AppData\\Local\\Ollama\\files\\errors';
    
    const readFiles = async (dir) => {
      try {
        const files = await readdir(dir);
        const fileList = await Promise.all(
          files.map(async (filename) => {
            const filepath = join(dir, filename);
            const stats = await stat(filepath);
            return {
              filename,
              name: filename,
              size: stats.size,
              modified: stats.mtime.toISOString(),
              created: stats.birthtime.toISOString(),
              type: 'document'
            };
          })
        );
        return fileList;
      } catch (error) {
        console.error(`Error reading ${dir}:`, error.message);
        return [];
      }
    };
    
    const [documents, completed, failed] = await Promise.all([
      readFiles(incomingDir),
      readFiles(processedDir),
      readFiles(errorDir)
    ]);
    
    const response = {
      success: true,
      documents,
      processing: [], // Processing status would require DB tracking
      completed,
      failed
    };
    
    console.log('📊 Document counts:', {
      documents: documents.length,
      processing: 0,
      completed: completed.length,
      failed: failed.length
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error getting all document status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}