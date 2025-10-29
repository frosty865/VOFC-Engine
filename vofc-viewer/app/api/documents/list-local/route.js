import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET() {
  try {
    console.log('📁 Listing uploaded documents...');
    
    const uploadDir = join(process.cwd(), 'uploads', 'documents');
    
    if (!existsSync(uploadDir)) {
      return NextResponse.json({
        success: true,
        message: 'Upload directory does not exist yet',
        files: []
      });
    }

    const files = await readdir(uploadDir);
    const fileDetails = [];

    for (const file of files) {
      try {
        const filePath = join(uploadDir, file);
        const stats = await stat(filePath);
        
        fileDetails.push({
          name: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isFile: stats.isFile(),
          url: `/api/documents/serve?file=${encodeURIComponent(file)}`
        });
      } catch (statError) {
        console.error(`Error getting stats for ${file}:`, statError);
        fileDetails.push({
          name: file,
          error: 'Could not read file stats'
        });
      }
    }

    // Sort by creation time (newest first)
    fileDetails.sort((a, b) => new Date(b.created) - new Date(a.created));

    console.log(`📊 Found ${fileDetails.length} files in upload directory`);

    return NextResponse.json({
      success: true,
      uploadDirectory: uploadDir,
      fileCount: fileDetails.length,
      files: fileDetails
    });

  } catch (error) {
    console.error('❌ Directory listing error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
