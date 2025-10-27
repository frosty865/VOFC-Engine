import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Get processing status from multiple sources
    const [submissions, fileStatus, ollamaStatus] = await Promise.all([
      getSubmissionStatus(),
      getFileProcessingStatus(),
      getOllamaStatus()
    ]);

    return NextResponse.json({
      success: true,
      monitoring: {
        submissions,
        file_processing: fileStatus,
        ollama_service: ollamaStatus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Monitoring error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get monitoring data' },
      { status: 500 }
    );
  }
}

async function getSubmissionStatus() {
  try {
    // Get submissions with processing status
    const { data: submissions, error } = await supabaseAdmin
      .from('submissions')
      .select('id, type, status, created_at, updated_at, data')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching submissions:', error);
      return { error: 'Failed to fetch submissions' };
    }

    // Analyze submission processing status
    const analysis = {
      total: submissions.length,
      pending: submissions.filter(s => s.status === 'pending_review').length,
      approved: submissions.filter(s => s.status === 'approved').length,
      rejected: submissions.filter(s => s.status === 'rejected').length,
      processed: submissions.filter(s => s.data && JSON.parse(s.data).parsed_at).length,
      with_ollama_results: submissions.filter(s => {
        try {
          const data = JSON.parse(s.data);
          return data.parser_version && data.parser_version.includes('ollama');
        } catch {
          return false;
        }
      }).length
    };

    return {
      analysis,
      recent_submissions: submissions.slice(0, 10).map(s => ({
        id: s.id,
        type: s.type,
        status: s.status,
        created_at: s.created_at,
        has_ollama_results: (() => {
          try {
            const data = JSON.parse(s.data);
            return data.parser_version && data.parser_version.includes('ollama');
          } catch {
            return false;
          }
        })()
      }))
    };

  } catch (error) {
    console.error('Error analyzing submissions:', error);
    return { error: 'Failed to analyze submissions' };
  }
}

async function getFileProcessingStatus() {
  try {
    const basePath = path.join(process.cwd(), 'data');
    const folders = ['docs', 'processing', 'completed', 'failed'];
    
    const status = {};
    
    for (const folder of folders) {
      const folderPath = path.join(basePath, folder);
      if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath);
        status[folder] = {
          count: files.length,
          files: files.slice(0, 5).map(file => {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);
            return {
              name: file,
              size: stats.size,
              modified: stats.mtime.toISOString()
            };
          })
        };
      } else {
        status[folder] = { count: 0, files: [] };
      }
    }

    return status;

  } catch (error) {
    console.error('Error getting file status:', error);
    return { error: 'Failed to get file processing status' };
  }
}

async function getOllamaStatus() {
  try {
    const ollamaBaseUrl = process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL || 'https://ollama.frostech.site';
    const ollamaModel = process.env.OLLAMA_MODEL || 'vofc-engine:latest';
    
    // Test Ollama connectivity
    const response = await fetch(`${ollamaBaseUrl}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      return {
        status: 'offline',
        error: `HTTP ${response.status}: ${response.statusText}`,
        url: ollamaBaseUrl
      };
    }

    const data = await response.json();
    const models = data.models || [];
    const targetModel = models.find(m => m.name.includes('vofc') || m.name.includes('engine'));

    return {
      status: 'online',
      url: ollamaBaseUrl,
      model: ollamaModel,
      available_models: models.map(m => m.name),
      target_model_found: !!targetModel,
      target_model_info: targetModel
    };

  } catch (error) {
    return {
      status: 'offline',
      error: error.message,
      url: process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL || 'https://ollama.frostech.site'
    };
  }
}
