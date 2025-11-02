import { NextResponse } from "next/server";

/**
 * Get real-time status of all services and processing information
 * Returns service health, file counts, and active processing status
 */
export async function GET(request) {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      services: {},
      files: {},
      processing: {},
      python: {}
    };

    const localOllamaUrl = process.env.OLLAMA_LOCAL_URL || 'http://127.0.0.1:5000';
    const ollamaApiUrl = process.env.OLLAMA_URL || 'https://ollama.frostech.site';
    
    // Check Flask Server (Python) - Local processing server
    try {
      const flaskResponse = await fetch(`${localOllamaUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (flaskResponse.ok) {
        const health = await flaskResponse.json();
        status.services.flask = {
          status: 'online',
          url: localOllamaUrl,
          status_code: flaskResponse.status,
          health: health.status || 'unknown',
          directories: health.directories || {},
          server: health.server || {}
        };
      } else {
        status.services.flask = {
          status: 'error',
          url: localOllamaUrl,
          status_code: flaskResponse.status,
          error: `HTTP ${flaskResponse.status}`
        };
      }
    } catch (error) {
      status.services.flask = {
        status: 'offline',
        url: localOllamaUrl,
        error: error.message || 'Connection failed'
      };
    }

    // Check Ollama API Service
    try {
      const ollamaResponse = await fetch(`${ollamaApiUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (ollamaResponse.ok) {
        const models = await ollamaResponse.json();
        status.services.ollama = {
          status: 'online',
          url: ollamaApiUrl,
          status_code: ollamaResponse.status,
          models_count: models.models?.length || 0,
          models: models.models?.map(m => m.name) || []
        };
      } else {
        status.services.ollama = {
          status: 'error',
          url: ollamaApiUrl,
          status_code: ollamaResponse.status,
          error: `HTTP ${ollamaResponse.status}`
        };
      }
    } catch (error) {
      status.services.ollama = {
        status: 'offline',
        url: ollamaApiUrl,
        error: error.message || 'Connection failed'
      };
    }

    // Check Supabase
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      status.services.supabase = {
        status: 'configured',
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      };
    } else {
      status.services.supabase = {
        status: 'not_configured',
        error: 'Missing environment variables'
      };
    }

    // Extract file counts from Flask health response
    if (status.services.flask?.directories) {
      status.files = {
        incoming: status.services.flask.directories.incoming?.file_count || 0,
        library: status.services.flask.directories.library?.file_count || 0,
        errors: status.services.flask.directories.errors?.file_count || 0,
        extracted_text: status.services.flask.directories['extracted-text']?.file_count || 0,
        processed: status.services.flask.directories.processed?.file_count || 0
      };
    } else {
      status.files = {
        incoming: 0,
        library: 0,
        errors: 0,
        extracted_text: 0,
        processed: 0
      };
    }

    // Processing status
    status.processing = {
      active_jobs: status.files.incoming > 0 ? status.files.incoming : 0,
      ready: status.files.incoming > 0,
      last_check: status.timestamp
    };

    // Python/Flask specific info
    if (status.services.flask?.server) {
      status.python = {
        status: status.services.flask.status === 'online' ? 'running' : 'stopped',
        model: status.services.flask.server.model || 'unknown',
        version: status.services.flask.server.version || 'unknown'
      };
    } else {
      status.python = {
        status: 'stopped',
        error: 'Flask server not responding'
      };
    }

    return NextResponse.json({
      success: true,
      status
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
