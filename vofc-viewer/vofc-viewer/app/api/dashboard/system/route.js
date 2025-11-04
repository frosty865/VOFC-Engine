import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase-admin.js';

export const dynamic = 'force-dynamic';

/**
 * System Health Status - Checks all local services
 */
export async function GET(request) {
  // Check admin authentication using Supabase token
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: Supabase admin client not available', timestamp: new Date().toISOString() },
        { status: 500 }
      )
    }
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    let accessToken = null;
    
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      accessToken = authHeader.slice(7).trim();
    }
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No authentication token provided', timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }
    
    // Verify token and check admin role
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token', timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }
    
    // Check user role
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const derivedRole = String(
      profile?.role || user.user_metadata?.role || 'user'
    ).toLowerCase();
    
    // Check if admin via role or email allowlist
    const isAdmin = ['admin', 'spsa'].includes(derivedRole);
    const allowlist = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const isEmailAdmin = allowlist.includes(String(user.email).toLowerCase());
    
    if (!isAdmin && !isEmailAdmin) {
      return NextResponse.json(
        { error: 'Admin access required', timestamp: new Date().toISOString() },
        { status: 403 }
      );
    }
  } catch (authException) {
    console.error('Auth check error:', authException);
    // On any auth error, return 401/403 instead of proceeding
    return NextResponse.json(
      { error: 'Authentication failed', timestamp: new Date().toISOString() },
      { status: 401 }
    );
  }
  
  // Continue with request (auth passed - supabaseAdmin is now available)

  try {
    // 1. Setup URLs first (needed for status initialization)
    // Priority: OLLAMA_SERVER_URL > OLLAMA_LOCAL_URL > derived from OLLAMA_URL > default
    const ollamaApiUrl = process.env.OLLAMA_URL || 'https://ollama.frostech.site';
    
    // Detect if we're in a local development environment
    const isLocalDev = process.env.NODE_ENV !== 'production' || 
                       process.env.VERCEL !== '1' ||
                       process.env.OLLAMA_LOCAL_URL;
    
    // Derive Flask server URL from Ollama URL if not explicitly set (use same domain, port 5000)
    // In local dev, default to localhost; in production, use Cloudflare tunnel URL
    let defaultFlaskUrl = isLocalDev 
      ? 'http://127.0.0.1:5000'  // Local development
      : 'https://flask.frostech.site';  // Production (Cloudflare tunnel)
    
    // If OLLAMA_URL is set and not production, try to derive from it
    if (process.env.OLLAMA_URL && isLocalDev) {
      try {
        const url = new URL(ollamaApiUrl);
        // If OLLAMA_URL points to localhost, use localhost for Flask too
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          defaultFlaskUrl = 'http://127.0.0.1:5000';
        }
      } catch {
        // If URL parsing fails, use default
      }
    } else if (process.env.OLLAMA_URL && !isLocalDev) {
      // In production, prefer flask.frostech.site (Cloudflare tunnel)
      // Only derive from OLLAMA_URL if it points to a different domain
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
    
    const flaskUrl = process.env.NEXT_PUBLIC_OLLAMA_SERVER_URL || 
                     process.env.OLLAMA_SERVER_URL || 
                     process.env.OLLAMA_LOCAL_URL || 
                     defaultFlaskUrl;

    const status = {
      timestamp: new Date().toISOString(),
      services: {
        flask: { status: 'unknown', url: flaskUrl },
        ollama: { status: 'unknown', url: ollamaApiUrl },
        supabase: { status: 'unknown', url: process.env.NEXT_PUBLIC_SUPABASE_URL }
      },
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
        model: 'unknown',
        version: 'unknown',
        executable: 'unknown',
        platform: {},
        runtime_status: 'unknown'
      },
      flask: {
        version: 'unknown',
        environment: 'unknown',
        debug: false
      },
      gpu: {
        available: false,
        utilization: 0,
        memory_used: 0,
        memory_total: 0,
        devices: []
      },
      backend: {
        active_connections: 0,
        requests_per_minute: 0,
        avg_response_time: 0,
        queue_size: 0
      }
    };

    // 2. Check Flask Server (Python backend) - Direct connection from Vercel server
    // Since this is server-side code running on Vercel, we can make external HTTP requests directly
    console.log('[SYSTEM API] Checking Flask server at:', flaskUrl);
    try {
      // Use /health endpoint which has comprehensive data (not /api/health which is just basic status)
      const flaskResponse = await fetch(`${flaskUrl}/health`, {
        signal: AbortSignal.timeout(10000), // 10 second timeout
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('[SYSTEM API] Flask response status:', flaskResponse.status, flaskResponse.ok);
      
      if (flaskResponse.ok) {
        const health = await flaskResponse.json();
        console.log('[SYSTEM API] Flask health data keys:', Object.keys(health));
        console.log('[SYSTEM API] Flask directories:', health.directories);
        console.log('[SYSTEM API] Flask server info:', health.server);
        console.log('[SYSTEM API] Flask python info:', health.python);
        console.log('[SYSTEM API] Flask gpu info:', health.gpu);
        console.log('[SYSTEM API] Flask backend stats:', health.backend);
          status.services.flask = {
            status: 'online',
            url: flaskUrl,
            status_code: flaskResponse.status,
            server: health.server,
            directories: health.directories
          };
          // Extract file counts - handle both directory name formats
          const dirs = health.directories || {};
          status.files.incoming = dirs.incoming?.file_count || 0;
          status.files.library = dirs.library?.file_count || 0;
          status.files.extracted_text = dirs['extracted_text']?.file_count || dirs['extracted-text']?.file_count || 0;
          status.files.errors = dirs.errors?.file_count || 0;
          
          // Extract comprehensive Python/Flask service information from /health endpoint
          status.python = {
            model: health.server?.model || health.model || 'unknown',
            version: health.python?.version || 'unknown',
            executable: health.python?.executable || 'unknown',
            platform: health.python?.platform || {},
            runtime_status: health.status === 'healthy' ? 'running' : 'stopped',
            status: health.status === 'healthy' ? 'running' : 'stopped'
          };
          
          // Extract Flask service information
          status.flask = {
            version: health.flask?.version || 'unknown',
            environment: health.flask?.environment || process.env.FLASK_ENV || process.env.ENVIRONMENT || 'production',
            debug: health.flask?.debug || false
          };
          
          // Extract Ollama models information
          if (!status.services.ollama_models) {
            status.services.ollama_models = [];
          }
          status.services.ollama_models = health.services?.ollama_models || [];
          status.services.ollama_base_url = health.services?.ollama_url || process.env.OLLAMA_URL || 'unknown';
          
          // Extract GPU utilization - the /health endpoint provides comprehensive GPU data
          if (health.gpu && typeof health.gpu === 'object' && health.gpu.available) {
            status.gpu = {
              available: true,
              utilization: health.gpu.utilization || 0,
              memory_used: health.gpu.memory_used || 0, // Already in GB
              memory_total: health.gpu.memory_total || 0, // Already in GB
              devices: health.gpu.devices || []
            };
          } else {
            status.gpu = {
              available: false,
              utilization: 0,
              memory_used: 0,
              memory_total: 0,
              devices: []
            };
          }
          
          // Extract backend statistics - the /health endpoint provides backend stats
          if (health.backend && typeof health.backend === 'object') {
            status.backend = {
              active_connections: health.backend.active_connections || 0,
              requests_per_minute: health.backend.requests_per_minute || 0,
              avg_response_time: health.backend.avg_response_time || 0,
              queue_size: health.backend.queue_size || status.files.incoming || 0
            };
          } else {
            // Fallback: use directory file counts as queue size indicator
            status.backend = {
              active_connections: 0,
              requests_per_minute: 0,
              avg_response_time: 0,
              queue_size: status.files.incoming || 0
            };
          }
      } else {
        // Try to get error details
        let errorText = ''
        try {
          errorText = await flaskResponse.text()
        } catch (e) {
          errorText = 'Could not read error response'
        }
        
        console.error('[SYSTEM API] Flask health endpoint returned error:', flaskResponse.status, errorText.substring(0, 200))
        
        status.services.flask = {
          status: 'error',
          url: flaskUrl,
          status_code: flaskResponse.status,
          error: `HTTP ${flaskResponse.status}: ${errorText.substring(0, 100)}`,
          note: `Flask server at ${flaskUrl}/health responded with error. Check server logs.`
        };
      }
    } catch (e) {
      // Connection failed - this is a critical error in production
      console.error('[SYSTEM API] Flask connection error:', e.message);
      console.error('[SYSTEM API] Flask error type:', e.name);
      console.error('[SYSTEM API] Flask error stack:', e.stack);
      status.services.flask = {
        status: 'offline',
        url: flaskUrl,
        error: e.message || 'Connection failed',
        note: e.message?.includes('fetch failed') 
          ? `Cannot reach Flask server at ${flaskUrl}. Ensure OLLAMA_SERVER_URL is configured in Vercel environment variables and the Flask server is accessible via Cloudflare tunnel.`
          : `Flask server connection failed: ${e.message}. Verify server is running and accessible.`
      };
    }

    // 3. Check Ollama API - Direct connection from Vercel server
    // Since this is server-side code running on Vercel, we can make external HTTP requests directly
    console.log('[SYSTEM API] Checking Ollama API at:', ollamaApiUrl);
    try {
      const ollamaResponse = await fetch(`${ollamaApiUrl}/api/tags`, {
        signal: AbortSignal.timeout(10000), // 10 second timeout
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('[SYSTEM API] Ollama response status:', ollamaResponse.status, ollamaResponse.ok);
      
      if (ollamaResponse.ok) {
        const models = await ollamaResponse.json();
        console.log('[SYSTEM API] Ollama models:', models.models?.length || 0);
        status.services.ollama = {
          status: 'online',
          url: ollamaApiUrl,
          status_code: ollamaResponse.status,
          models_count: models.models?.length || 0,
          models: models.models?.map(m => m.name) || []
        };
      } else {
        console.error('[SYSTEM API] Ollama returned error status:', ollamaResponse.status);
        status.services.ollama = {
          status: 'error',
          url: ollamaApiUrl,
          status_code: ollamaResponse.status,
          error: `HTTP ${ollamaResponse.status}`
        };
      }
    } catch (e) {
      console.error('[SYSTEM API] Ollama connection error:', e.message);
      status.services.ollama = {
        status: 'offline',
        url: ollamaApiUrl,
        error: e.message || 'Connection failed'
      };
    }

    // 3. Check Supabase (already have supabaseAdmin from auth check)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('[SYSTEM API] Checking Supabase:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey,
      hasAdmin: !!supabaseAdmin
    });
    
    if (supabaseUrl && supabaseServiceKey && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('submissions').select('id').limit(1);
        
        console.log('[SYSTEM API] Supabase test query:', { hasData: !!data, error: error?.message });
        
        if (error) {
          console.error('[SYSTEM API] Supabase error:', error);
          status.services.supabase = {
            status: 'error',
            url: supabaseUrl,
            error: error.message
          };
        } else {
          status.services.supabase = {
            status: 'online',
            url: supabaseUrl
          };
        }
      } catch (e) {
        console.error('[SYSTEM API] Supabase connection error:', e.message);
        status.services.supabase = {
          status: 'error',
          url: supabaseUrl,
          error: e.message || 'Connection failed'
        };
      }
    } else {
      console.warn('[SYSTEM API] Supabase not configured:', {
        url: supabaseUrl || 'missing',
        key: supabaseServiceKey ? 'present' : 'missing',
        admin: supabaseAdmin ? 'present' : 'missing'
      });
      status.services.supabase = {
        status: 'warning',
        url: supabaseUrl || 'Not configured',
        error: supabaseAdmin ? 'Supabase credentials missing' : 'Supabase client not initialized'
      };
    }

    // Processing status - use actual file counts from Flask
    status.processing = {
      active_jobs: status.files.incoming || 0,
      ready: (status.files.incoming || 0) > 0,
      last_check: status.timestamp
    };

    // Add parsing and processing statistics from database
    console.log('[SYSTEM API] Fetching database statistics...');
    try {
      // Get submission statistics
      const { count: totalSubmissions, error: subError } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact', head: true });
      
      console.log('[SYSTEM API] Total submissions:', totalSubmissions, subError ? `(error: ${subError.message})` : '');
      
      const { count: pendingSubmissions } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_review');
      
      const { count: approvedSubmissions } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
      
      const { count: rejectedSubmissions } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected');

      // Get vulnerability and OFC counts from production tables
      const { count: totalVulnerabilities } = await supabaseAdmin
        .from('submission_vulnerabilities')
        .select('*', { count: 'exact', head: true });
      
      const { count: totalOfcs } = await supabaseAdmin
        .from('submission_options_for_consideration')
        .select('*', { count: 'exact', head: true });

      // Get learning events statistics
      const { count: totalLearningEvents } = await supabaseAdmin
        .from('learning_events')
        .select('*', { count: 'exact', head: true });
      
      const { count: approvedLearningEvents } = await supabaseAdmin
        .from('learning_events')
        .select('*', { count: 'exact', head: true })
        .eq('approved', true);

      // Get recent submissions for processing timeline
      const { data: recentSubmissions } = await supabaseAdmin
        .from('submissions')
        .select('id, status, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(10);

      console.log('[SYSTEM API] Database stats:', {
        totalSubmissions,
        pendingSubmissions,
        approvedSubmissions,
        rejectedSubmissions,
        totalVulnerabilities,
        totalOfcs,
        totalLearningEvents,
        approvedLearningEvents,
        recentSubmissionsCount: recentSubmissions?.length || 0
      });

      status.parsing = {
        total_submissions: totalSubmissions || 0,
        pending_review: pendingSubmissions || 0,
        approved: approvedSubmissions || 0,
        rejected: rejectedSubmissions || 0,
        total_vulnerabilities: totalVulnerabilities || 0,
        total_ofcs: totalOfcs || 0,
        recent_submissions: recentSubmissions || []
      };

      status.learning = {
        total_events: totalLearningEvents || 0,
        approved_events: approvedLearningEvents || 0
      };

    } catch (statsError) {
      console.error('[SYSTEM API] Error fetching parsing statistics:', statsError);
      console.error('[SYSTEM API] Stats error details:', {
        message: statsError.message,
        name: statsError.name,
        stack: statsError.stack
      });
      status.parsing = {
        total_submissions: 0,
        pending_review: 0,
        approved: 0,
        rejected: 0,
        total_vulnerabilities: 0,
        total_ofcs: 0,
        error: statsError.message
      };
      status.learning = {
        total_events: 0,
        approved_events: 0
      };
    }

    // DEBUG: Log the full status object before returning
    console.log('[SYSTEM API] Returning status:', JSON.stringify(status, null, 2));
    console.log('[SYSTEM API] Services:', {
      flask: status.services?.flask?.status,
      ollama: status.services?.ollama?.status,
      supabase: status.services?.supabase?.status
    });
    console.log('[SYSTEM API] Files:', status.files);
    console.log('[SYSTEM API] Parsing:', status.parsing);
    console.log('[SYSTEM API] Processing:', status.processing);
    
    return NextResponse.json(status);
    
  } catch (e) {
    console.error('[SYSTEM API] Error in /api/dashboard/system:', e);
    console.error('[SYSTEM API] Stack trace:', e.stack);
    return NextResponse.json(
      { error: e.message || 'Internal server error', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}


