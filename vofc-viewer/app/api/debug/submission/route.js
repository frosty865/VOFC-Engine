import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';
import { existsSync, mkdir } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    console.log('🔍 Running submission diagnostic...');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
        OLLAMA_URL: process.env.OLLAMA_URL || 'NOT_SET',
        OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'NOT_SET'
      },
      database: {
        connection: 'unknown',
        submissions_table: 'unknown'
      },
      local_storage: {
        upload_directory: 'unknown',
        directory_writable: 'unknown'
      },
      ollama: {
        reachable: 'unknown',
        model_available: 'unknown'
      }
    };

    // Test database connection
    try {
      const { data, error } = await supabaseAdmin
        .from('submissions')
        .select('count')
        .limit(1);
      
      if (error) {
        diagnostics.database.connection = `ERROR: ${error.message}`;
        diagnostics.database.submissions_table = `ERROR: ${error.message}`;
      } else {
        diagnostics.database.connection = 'CONNECTED';
        diagnostics.database.submissions_table = 'ACCESSIBLE';
      }
    } catch (dbError) {
      diagnostics.database.connection = `EXCEPTION: ${dbError.message}`;
    }

    // Test local storage directory
    try {
      const uploadDir = join(process.cwd(), 'uploads', 'documents');
      diagnostics.local_storage.upload_directory = uploadDir;
      
      if (!existsSync(uploadDir)) {
        diagnostics.local_storage.directory_writable = 'DIRECTORY_NOT_EXISTS';
        // Try to create it
        try {
          await mkdir(uploadDir, { recursive: true });
          diagnostics.local_storage.directory_writable = 'CREATED_SUCCESSFULLY';
        } catch (createError) {
          diagnostics.local_storage.directory_writable = `CREATE_FAILED: ${createError.message}`;
        }
      } else {
        diagnostics.local_storage.directory_writable = 'EXISTS';
      }
    } catch (storageError) {
      diagnostics.local_storage.directory_writable = `EXCEPTION: ${storageError.message}`;
    }

    // Test Ollama connection
    try {
      const ollamaBaseUrl = process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL || 'https://ollama.frostech.site';
      const response = await fetch(`${ollamaBaseUrl}/api/tags`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        diagnostics.ollama.reachable = 'REACHABLE';
        const data = await response.json();
        const models = data.models || [];
        const targetModel = process.env.OLLAMA_MODEL || 'vofc-engine:latest';
        diagnostics.ollama.model_available = models.some(m => m.name === targetModel) ? 'AVAILABLE' : 'NOT_FOUND';
      } else {
        diagnostics.ollama.reachable = `ERROR: ${response.status} ${response.statusText}`;
      }
    } catch (ollamaError) {
      diagnostics.ollama.reachable = `EXCEPTION: ${ollamaError.message}`;
    }

    console.log('📊 Diagnostic results:', JSON.stringify(diagnostics, null, 2));
    
    return NextResponse.json({
      success: true,
      diagnostics
    });

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
