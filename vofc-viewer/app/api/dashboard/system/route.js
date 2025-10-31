import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * System Health Status - Checks all local services
 */
export async function GET(request) {
  // Check admin authentication using Supabase token
  let supabaseAdmin = null;
  
  try {
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
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error', timestamp: new Date().toISOString() },
        { status: 500 }
      );
    }
    
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
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
    const status = {
      timestamp: new Date().toISOString(),
      services: {
        flask: { status: 'unknown', url: process.env.OLLAMA_LOCAL_URL || 'http://127.0.0.1:5000' },
        ollama: { status: 'unknown', url: process.env.OLLAMA_URL || 'https://ollama.frostech.site' },
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
        runtime_status: 'unknown'
      }
    };

    // 1. Check Flask Server (Python backend) - skip in production
    const flaskUrl = process.env.OLLAMA_LOCAL_URL || 'http://127.0.0.1:5000';
    const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
    const isLocalUrl = flaskUrl.includes('127.0.0.1') || flaskUrl.includes('localhost') || flaskUrl.includes('0.0.0.0');
    
    // Only check Flask if we're in development or it's a local URL
    if (!isProduction || isLocalUrl) {
      try {
        const flaskResponse = await fetch(`${flaskUrl}/health`, {
          signal: AbortSignal.timeout(2000)
        });
        
        if (flaskResponse.ok) {
          const health = await flaskResponse.json();
          status.services.flask = {
            status: 'online',
            url: flaskUrl,
            status_code: flaskResponse.status,
            server: health.server,
            directories: health.directories
          };
          status.files.incoming = health.directories?.incoming?.file_count || 0;
          status.files.library = health.directories?.library?.file_count || 0;
          status.files.extracted_text = health.directories?.['extracted_text']?.file_count || 0;
          status.files.errors = health.directories?.errors?.file_count || 0;
          status.python.model = health.server?.model || 'unknown';
          status.python.version = health.server?.python_version || 'unknown';
          status.python.runtime_status = 'running';
        } else {
          status.services.flask = {
            status: 'error',
            url: flaskUrl,
            status_code: flaskResponse.status,
            error: `HTTP ${flaskResponse.status}`
          };
        }
      } catch (e) {
        status.services.flask = {
          status: 'offline',
          url: flaskUrl,
          error: e.message || 'Connection failed',
          note: isProduction ? 'Flask server not accessible in production' : undefined
        };
      }
    } else {
      // In production with non-local URL, mark as unavailable
      status.services.flask = {
        status: 'unavailable',
        url: flaskUrl,
        note: 'Flask server check skipped in production (only accessible locally)'
      };
    }

    // 2. Check Ollama API
    const ollamaApiUrl = process.env.OLLAMA_URL || 'https://ollama.frostech.site';
    try {
      const ollamaResponse = await fetch(`${ollamaApiUrl}/api/tags`, {
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
    } catch (e) {
      status.services.ollama = {
        status: 'offline',
        url: ollamaApiUrl,
        error: e.message || 'Connection failed'
      };
    }

    // 3. Check Supabase (already have supabaseAdmin from auth check)
    if (supabaseUrl && supabaseServiceKey && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('submissions').select('id').limit(1);
        
        if (error) {
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
        status.services.supabase = {
          status: 'error',
          url: supabaseUrl,
          error: e.message || 'Connection failed'
        };
      }
    } else {
      status.services.supabase = {
        status: 'warning',
        url: supabaseUrl || 'Not configured',
        error: supabaseAdmin ? 'Supabase credentials missing' : 'Supabase client not initialized'
      };
    }

    // Processing status
    status.processing = {
      active_jobs: status.files.incoming > 0 ? status.files.incoming : 0,
      ready: status.files.incoming > 0,
      last_check: status.timestamp
    };

    return NextResponse.json(status);
    
  } catch (e) {
    console.error('Error in /api/dashboard/system:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}


