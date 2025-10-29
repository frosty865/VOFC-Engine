import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request) {
  try {
    console.log('📁 Local file upload API called');
    
    // Check content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      console.log('❌ Invalid content type:', contentType);
      return NextResponse.json(
        { success: false, error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
    }
    
    // Parse form data
    let formData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error('FormData parsing error:', formError);
      return NextResponse.json(
        { success: false, error: 'Failed to parse form data' },
        { status: 400 }
      );
    }
    
    // Extract file
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 413 }
      );
    }

    // Create upload directory structure
    const uploadDir = join(process.cwd(), 'uploads', 'documents');
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const fileName = `${baseName}_${timestamp}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);

    console.log('📁 Upload details:');
    console.log('- Upload directory:', uploadDir);
    console.log('- File name:', fileName);
    console.log('- File path:', filePath);
    console.log('- File size:', file.size, 'bytes');
    console.log('- File type:', file.type);

    // Ensure upload directory exists
    try {
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
        console.log('✅ Created upload directory:', uploadDir);
      }
    } catch (dirError) {
      console.error('❌ Error creating upload directory:', dirError);
      return NextResponse.json(
        { success: false, error: 'Failed to create upload directory' },
        { status: 500 }
      );
    }

    // Convert file to buffer and save
    try {
      const buffer = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(buffer));
      console.log('✅ File saved successfully:', filePath);
      
      // Return success with file information
      return NextResponse.json({
        success: true,
        fileName: fileName,
        filePath: filePath,
        relativePath: `uploads/documents/${fileName}`,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
      });

    } catch (writeError) {
      console.error('❌ Error writing file:', writeError);
      return NextResponse.json(
        { success: false, error: 'Failed to save file' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Upload API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
