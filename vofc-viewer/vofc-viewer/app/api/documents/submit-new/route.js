import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    console.log('📤 Document upload API called');
    
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Paths
    const baseDir = process.env.OLLAMA_FILE_STORAGE || 'C:/Users/frost/AppData/Local/Ollama/data';
    const incomingDir = process.env.OLLAMA_INCOMING_PATH || join(baseDir, 'incoming');
    const libraryDir = process.env.OLLAMA_LIBRARY_PATH || join(baseDir, 'library');

    console.log('📁 Storage directories:');
    console.log('- Incoming:', incomingDir);
    console.log('- Library:', libraryDir);

    // Ensure dirs exist
    for (const dir of [incomingDir, libraryDir]) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
        console.log('✅ Created directory:', dir);
      }
    }

    // Write file to incoming
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = join(incomingDir, file.name);
    await writeFile(filePath, buffer);
    console.log('📄 File saved to incoming:', filePath);

    // Note: File will be moved to library after successful processing
    console.log('📝 File will be moved to library after successful processing');

    // Optional: trigger local parsing immediately
    const ollamaUrl = process.env.OLLAMA_URL || 'https://ollama.frostech.site';
    const autoProcess = process.env.AUTO_PROCESS_ON_UPLOAD === 'true';

    if (autoProcess) {
      try {
        await fetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: process.env.OLLAMA_MODEL || 'vofc-engine:latest',
            prompt: `Parse and extract vulnerabilities and OFCs from ${file.name}`
          })
        });
        console.log('🤖 Auto-processing triggered');
      } catch (err) {
        console.error('⚠️ Ollama auto-process failed (non-critical):', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      file: file.name,
      path: filePath.replaceAll('\\', '/'),
      message: 'Document uploaded successfully'
    });

  } catch (err) {
    console.error('❌ File upload error:', err);
    return NextResponse.json(
      { success: false, error: 'Upload failed: ' + err.message },
      { status: 500 }
    );
  }
}
