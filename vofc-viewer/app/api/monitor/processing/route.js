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
    const { checkOllamaHealth, getOllamaUrl } = await import('@/app/lib/server-utils');
    const healthData = await checkOllamaHealth();
    
    if (healthData.status === 'offline') {
      return {
        status: 'offline',
        error: healthData.message,
        url: healthData.url,
        model: process.env.OLLAMA_MODEL || 'vofc-engine:latest',
        available_models: [],
        target_model_found: false,
        queue_size: 0
      };
    }

    const models = healthData.models || [];
    const targetModel = models.find(m => m.name.includes('vofc') || m.name.includes('engine'));

    return {
      status: 'online',
      url: healthData.url,
      model: process.env.OLLAMA_MODEL || 'vofc-engine:latest',
      available_models: models.map(m => m.name),
      target_model_found: !!targetModel,
      target_model_info: targetModel,
      queue_size: 0
    };

  } catch (error) {
    const { getOllamaUrl } = await import('@/app/lib/server-utils');
    return {
      status: 'offline',
      error: error.message,
      url: getOllamaUrl(),
      available_models: [],
      target_model_found: false,
      queue_size: 0
    };
  }
}
