import { NextResponse } from 'next/server';
import { readdir, rename, existsSync } from 'fs/promises';
import { join } from 'path';
import { stat } from 'fs';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('🔄 Starting batch document processing');
    
    const ollamaUrl = process.env.OLLAMA_URL || 'https://ollama.frostech.site';
    const incomingDir = process.env.OLLAMA_INCOMING_PATH || 'C:/Users/frost/AppData/Local/Ollama/automation/incoming';
    const processedDir = process.env.OLLAMA_PROCESSED_PATH || 'C:/Users/frost/AppData/Local/Ollama/automation/processed';
    const errorDir = process.env.OLLAMA_ERROR_PATH || 'C:/Users/frost/AppData/Local/Ollama/automation/errors';

    if (!existsSync(incomingDir)) {
      return NextResponse.json({ 
        success: true,
        message: 'No incoming folder found',
        processed: 0 
      });
    }

    const files = await readdir(incomingDir);
    if (files.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No files to process',
        processed: 0 
      });
    }

    console.log(`📊 Found ${files.length} files to process`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      const filePath = join(incomingDir, file);
      try {
        console.log(`📄 Processing: ${file}`);
        
        const response = await fetch(`${ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: process.env.OLLAMA_MODEL || 'vofc-engine:latest',
            messages: [
              {
                role: 'system',
                content: 'You are an expert document analyzer. Extract vulnerabilities and options for consideration from security documents.'
              },
              {
                role: 'user',
                content: `Analyze the document: ${file}`
              }
            ],
            stream: false
          })
        });

        const data = await response.json();
        const content = data.message?.content || data.response || '';
        
        results.push({ 
          file, 
          success: true, 
          response: content.substring(0, 200) + '...',
          timestamp: new Date().toISOString()
        });

        await rename(filePath, join(processedDir, file));
        console.log(`✅ Processed successfully: ${file}`);
        successCount++;
        
      } catch (err) {
        console.error(`❌ Failed to process ${file}:`, err.message);
        
        try {
          await rename(filePath, join(errorDir, file));
        } catch (moveErr) {
          console.error(`⚠️ Failed to move ${file} to error folder:`, moveErr.message);
        }
        
        results.push({ 
          file, 
          success: false, 
          error: err.message,
          timestamp: new Date().toISOString()
        });
        errorCount++;
      }
    }

    console.log(`📊 Batch processing complete: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({ 
      success: true,
      processed: successCount,
      errors: errorCount,
      total: files.length,
      results: results,
      message: `Processed ${successCount} files successfully, ${errorCount} errors`
    });

  } catch (err) {
    console.error('❌ Batch processing error:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Batch process failed: ' + err.message 
      },
      { status: 500 }
    );
  }
}
