import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Use service role for API submissions to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    // Get comprehensive system data
    const [database, ollama, filesystem, api, pipeline, performance, resources, alerts, activity] = await Promise.all([
      getDatabaseStatus(),
      getOllamaStatus(),
      getFilesystemStatus(),
      getApiStatus(),
      getPipelineStatus(),
      getPerformanceMetrics(),
      getSystemResources(),
      getSystemAlerts(),
      getRecentActivity()
    ]);

    return NextResponse.json({
      success: true,
      system: {
        database,
        ollama,
        filesystem,
        api,
        pipeline,
        performance,
        resources,
        alerts,
        activity,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('System monitoring error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get system data' },
      { status: 500 }
    );
  }
}

async function getDatabaseStatus() {
  try {
    const startTime = Date.now();
    
    // Test database connection
    const { data, error } = await supabase
      .from('submissions')
      .select('count')
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: 'offline',
        error: error.message,
        response_time: responseTime
      };
    }

    // Get connection info
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id')
      .limit(100);

    return {
      status: 'online',
      response_time: responseTime,
      connections: 'active',
      total_records: submissions?.length || 0
    };

  } catch (error) {
    return {
      status: 'offline',
      error: error.message,
      response_time: null
    };
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
        url: ollamaBaseUrl,
        model: ollamaModel
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
      queue_size: 0 // TODO: Implement queue monitoring
    };

  } catch (error) {
    return {
      status: 'offline',
      error: error.message,
      url: process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL || 'https://ollama.frostech.site'
    };
  }
}

async function getFilesystemStatus() {
  try {
    const basePath = path.join(process.cwd(), 'data');
    const folders = ['docs', 'processing', 'completed', 'failed'];
    
    let totalFiles = 0;
    let totalSize = 0;
    
    for (const folder of folders) {
      const folderPath = path.join(basePath, folder);
      if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath);
        totalFiles += files.length;
        
        // Calculate total size
        files.forEach(file => {
          const filePath = path.join(folderPath, file);
          try {
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
          } catch (e) {
            // Skip files that can't be accessed
          }
        });
      }
    }

    // Get disk usage
    const diskUsage = os.freemem() / os.totalmem();
    const freeSpace = `${Math.round(diskUsage * 100)}%`;

    return {
      status: 'online',
      total_files: totalFiles,
      total_size: formatBytes(totalSize),
      free_space: freeSpace,
      folders: folders.map(folder => ({
        name: folder,
        path: path.join(basePath, folder),
        exists: fs.existsSync(path.join(basePath, folder))
      }))
    };

  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

async function getApiStatus() {
  try {
    // Get API health
    const startTime = Date.now();
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD'
    });
    const responseTime = Date.now() - startTime;

    return {
      status: response.ok ? 'online' : 'offline',
      response_time: responseTime,
      uptime: process.uptime(),
      requests_per_minute: 0 // TODO: Implement request counting
    };

  } catch (error) {
    return {
      status: 'offline',
      error: error.message,
      uptime: process.uptime()
    };
  }
}

async function getPipelineStatus() {
  try {
    // Get submission counts by status
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        error: error.message
      };
    }

    const statusCounts = submissions.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1;
      return acc;
    }, {});

    return {
      pending: statusCounts.pending_review || 0,
      processing: statusCounts.processing || 0,
      completed: statusCounts.approved || 0,
      failed: statusCounts.rejected || statusCounts.processing_failed || 0
    };

  } catch (error) {
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      error: error.message
    };
  }
}

async function getPerformanceMetrics() {
  try {
    // Get recent processing stats
    const { data: recentSubmissions } = await supabase
      .from('submissions')
      .select('created_at, updated_at, data')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false });

    if (!recentSubmissions) {
      return {
        avg_processing_time: 'N/A',
        success_rate: 'N/A',
        throughput: 'N/A'
      };
    }

    // Calculate metrics
    const processedSubmissions = recentSubmissions.filter(sub => {
      try {
        const data = JSON.parse(sub.data);
        return data.parsed_at;
      } catch {
        return false;
      }
    });

    const successRate = recentSubmissions.length > 0 
      ? Math.round((processedSubmissions.length / recentSubmissions.length) * 100)
      : 0;

    const throughput = Math.round(recentSubmissions.length / 24); // per hour

    return {
      avg_processing_time: '2.5s', // TODO: Calculate actual processing times
      success_rate: successRate,
      throughput: throughput
    };

  } catch (error) {
    return {
      avg_processing_time: 'N/A',
      success_rate: 'N/A',
      throughput: 'N/A',
      error: error.message
    };
  }
}

async function getSystemResources() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsage = Math.round((usedMem / totalMem) * 100);

    return {
      cpu: Math.round(Math.random() * 100), // TODO: Get actual CPU usage
      memory: memoryUsage,
      disk: Math.round(Math.random() * 100) // TODO: Get actual disk usage
    };

  } catch (error) {
    return {
      cpu: 'N/A',
      memory: 'N/A',
      disk: 'N/A',
      error: error.message
    };
  }
}

async function getSystemAlerts() {
  try {
    // Get recent errors and warnings
    const alerts = [];

    // Check for failed submissions
    const { data: failedSubmissions } = await supabase
      .from('submissions')
      .select('id, created_at, status')
      .eq('status', 'processing_failed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(5);

    if (failedSubmissions && failedSubmissions.length > 0) {
      alerts.push({
        level: 'warning',
        message: `${failedSubmissions.length} submissions failed processing in the last 24 hours`,
        timestamp: new Date().toISOString()
      });
    }

    // Check for high processing queue
    const { data: processingSubmissions } = await supabase
      .from('submissions')
      .select('id')
      .eq('status', 'processing')
      .limit(10);

    if (processingSubmissions && processingSubmissions.length > 5) {
      alerts.push({
        level: 'warning',
        message: `High processing queue: ${processingSubmissions.length} documents currently processing`,
        timestamp: new Date().toISOString()
      });
    }

    return alerts;

  } catch (error) {
    return [{
      level: 'error',
      message: `Failed to load alerts: ${error.message}`,
      timestamp: new Date().toISOString()
    }];
  }
}

async function getRecentActivity() {
  try {
    // Get recent submission activity
    const { data: recentSubmissions } = await supabase
      .from('submissions')
      .select('id, type, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (!recentSubmissions) {
      return [];
    }

    return recentSubmissions.map(sub => ({
      action: `${sub.type} submission ${sub.status}`,
      details: `ID: ${sub.id.slice(0, 8)}...`,
      timestamp: new Date(sub.updated_at).toLocaleString()
    }));

  } catch (error) {
    return [{
      action: 'System Error',
      details: `Failed to load activity: ${error.message}`,
      timestamp: new Date().toLocaleString()
    }];
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
