import { NextResponse } from "next/server";
import { applyCacheHeaders, CacheStrategies } from '@/app/api/middleware/cache.js';

/**
 * Get real-time status of all services and processing information
 * Returns service health, file counts, and active processing status
 * 
 * Cache: 30 seconds (frequently changing data)
 */
export const revalidate = 30;

export async function GET(request) {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      services: {},
      files: {
        incoming: 0,
        library: 0,
        extracted_text: 0,
        errors: 0
      },
      processing: {
        active_jobs: 0,
        ready: false
      },
      python: {
        version: 'unknown',
        executable: 'unknown',
        platform: {},
        model: 'unknown',
        runtime_status: 'unknown'
      }
    };

    // Flask Server URL - Priority: OLLAMA_SERVER_URL > OLLAMA_LOCAL_URL > derived from OLLAMA_URL > default
    const ollamaApiUrl = process.env.OLLAMA_URL || 'https://ollama.frostech.site';
    
    // Detect if we're in a local development environment
    const isLocalDev = process.env.NODE_ENV !== 'production' || 
                       process.env.VERCEL !== '1' ||
                       process.env.OLLAMA_LOCAL_URL;
    
    // Derive Flask server URL - use localhost in local dev, production URL in production
    // Production uses Cloudflare tunnel at flask.frostech.site (no port, HTTPS)
    let defaultFlaskUrl = isLocalDev 
      ? 'http://127.0.0.1:5000'  // Local development
      : 'https://flask.frostech.site';  // Production (Cloudflare tunnel)
    
    // If OLLAMA_URL is set and not production, try to derive from it
    if (process.env.OLLAMA_URL && isLocalDev) {
      try {
        const url = new URL(ollamaApiUrl);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          defaultFlaskUrl = 'http://127.0.0.1:5000';
        }
      } catch {
        // If URL parsing fails, use default
      }
    } else if (process.env.OLLAMA_URL && !isLocalDev) {
      // In production, prefer flask.frostech.site (Cloudflare tunnel)
      try {
        const url = new URL(ollamaApiUrl);
        // If OLLAMA_URL is ollama.frostech.site, use flask.frostech.site for Flask
        if (url.hostname === 'ollama.frostech.site') {
          defaultFlaskUrl = 'https://flask.frostech.site';
        } else {
          // Otherwise try to derive (but Cloudflare tunnel doesn't use ports)
          defaultFlaskUrl = `${url.protocol}//flask.${url.hostname}`;
        }
      } catch {
        // If URL parsing fails, use default
      }
    }
    
    const flaskUrl = process.env.OLLAMA_SERVER_URL || process.env.OLLAMA_LOCAL_URL || defaultFlaskUrl;
    
    // Check Flask Server (Python) - Production processing server
    try {
      const flaskResponse = await fetch(`${flaskUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (flaskResponse.ok) {
        const health = await flaskResponse.json();
        
        // Extract file counts from directories
        const dirs = health.directories || {};
        status.files = {
          incoming: dirs.incoming?.file_count || 0,
          library: dirs.library?.file_count || 0,
          extracted_text: dirs['extracted_text']?.file_count || dirs['extracted-text']?.file_count || 0,
          errors: dirs.errors?.file_count || 0
        };
        
        status.services.flask = {
          status: 'online',
          url: flaskUrl,
          status_code: flaskResponse.status,
          health: health.status || 'unknown',
          directories: health.directories || {},
          server: health.server || {},
          python: health.python || {},
          flask: health.flask || {},
          services: health.services || {}
        };
        
        // Extract Python/Flask service information
        if (health.python) {
          status.python = {
            version: health.python.version || 'unknown',
            executable: health.python.executable || 'unknown',
            platform: health.python.platform || {},
            model: health.server?.model || 'unknown',
            runtime_status: 'running'
          };
        }
        
        status.processing = {
          active_jobs: 0, // TODO: Track active processing jobs
          ready: (status.files.incoming || 0) === 0  // Ready if no files waiting
        };
      } else {
        status.services.flask = {
          status: 'error',
          url: flaskUrl,
          status_code: flaskResponse.status,
          error: `HTTP ${flaskResponse.status}`
        };
      }
    } catch (error) {
      status.services.flask = {
        status: 'offline',
        url: flaskUrl,
        error: error.message || 'Connection failed',
        note: `Cannot reach Flask server at ${flaskUrl}. Ensure server is running and OLLAMA_SERVER_URL is configured correctly.`
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
    // Handle both 'extracted-text' (legacy) and 'extracted_text' (current) directory names
    if (status.services.flask?.directories && status.services.flask.status === 'online') {
      const dirs = status.services.flask.directories;
      status.files = {
        incoming: dirs.incoming?.file_count || 0,
        library: dirs.library?.file_count || 0,
        errors: dirs.errors?.file_count || 0,
        extracted_text: dirs['extracted_text']?.file_count || dirs['extracted-text']?.file_count || 0,
        processed: dirs.processed?.file_count || 0
      };
    } else {
      // If Flask is offline, still return structure but with zeros
      // This ensures the dashboard doesn't break when Flask is temporarily unavailable
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

    // Python/Flask specific info - extract from Flask health response
    if (status.services.flask?.status === 'online' && status.services.flask.python) {
      status.python = {
        status: 'running',
        model: status.services.flask.server?.model || 'unknown',
        version: status.services.flask.python.version || 'unknown',
        executable: status.services.flask.python.executable || 'unknown',
        platform: status.services.flask.python.platform || {}
      };
      
      // Extract Flask service info
      status.flask = {
        version: status.services.flask.flask?.version || 'unknown',
        environment: status.services.flask.flask?.environment || 'unknown',
        debug: status.services.flask.flask?.debug || false
      };
      
      // Extract Ollama models if available
      if (status.services.flask.services?.ollama_models) {
        status.services.ollama_models = status.services.flask.services.ollama_models;
        status.services.ollama_base_url = status.services.flask.services.ollama_url || ollamaApiUrl;
      }
    } else {
      status.python = {
        status: 'stopped',
        error: 'Flask server not responding'
      };
      status.flask = {
        version: 'unknown',
        environment: 'unknown',
        debug: false
      };
    }

    const response = NextResponse.json({
      success: true,
      status
    });
    
    // Apply 30-second cache for dashboard status
    return applyCacheHeaders(response, CacheStrategies.SHORT);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
