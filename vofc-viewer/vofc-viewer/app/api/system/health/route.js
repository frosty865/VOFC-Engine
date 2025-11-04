import { NextResponse } from 'next/server'
import { checkFlaskHealth, checkOllamaHealth, getFlaskUrl, getOllamaUrl } from '@/app/lib/server-utils'
import { createClient } from '@supabase/supabase-js'
import { applyCacheHeaders, CacheStrategies } from '@/app/api/middleware/cache.js'

// Health checks should be dynamic but cached for 30 seconds
export const dynamic = 'force-dynamic'
export const revalidate = 30 // Revalidate every 30 seconds

/**
 * Check Supabase connectivity
 */
async function checkSupabaseHealth() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return { status: 'unknown', message: 'Supabase credentials not configured' }
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Simple query to test connection
    const { data, error } = await supabase.from('submissions').select('id').limit(1)
    
    if (error && error.code !== 'PGRST116') {
      return { status: 'offline', message: error.message }
    }
    
    return { status: 'online', message: 'Supabase is accessible' }
  } catch (err) {
    return { status: 'offline', message: err.message || 'Supabase connection failed' }
  }
}

export async function GET() {
  const FLASK_URL = getFlaskUrl()
  const OLLAMA_URL = getOllamaUrl()
  
  // Check all servers independently with longer timeout for production reliability
  // Use Promise.allSettled to ensure all checks complete even if one fails
  const [flaskHealth, ollamaHealth, supabaseHealth] = await Promise.allSettled([
    Promise.race([
      checkFlaskHealth(3), // 3 retries with exponential backoff
      new Promise((_, reject) => setTimeout(() => reject(new Error('Flask health check timeout')), 30000))
    ]).catch(err => ({ status: 'offline', error: err.message, components: { flask: 'offline' } })),
    Promise.race([
      checkOllamaHealth(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Ollama health check timeout')), 10000))
    ]).catch(err => ({ status: 'offline', message: err.message })),
    Promise.race([
      checkSupabaseHealth(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase health check timeout')), 10000))
    ]).catch(err => ({ status: 'offline', message: err.message })),
  ])
  
  // Extract results
  const flask = flaskHealth.status === 'fulfilled' ? flaskHealth.value : { 
    status: 'offline', 
    components: { flask: 'offline' },
    error: flaskHealth.reason?.message || 'Flask check failed'
  }
  
  const ollama = ollamaHealth.status === 'fulfilled' ? ollamaHealth.value : { 
    status: 'offline',
    message: ollamaHealth.reason?.message || 'Ollama check failed'
  }
  
  const supabase = supabaseHealth.status === 'fulfilled' ? supabaseHealth.value : { 
    status: 'offline',
    message: supabaseHealth.reason?.message || 'Supabase check failed'
  }
  
  // Build response - use Flask's component data if available, otherwise use independent checks
  // Flask is online if we got a successful response (status === 'ok' or components.flask === 'online')
  const flaskIsOnline = flask.status === 'ok' || flask.components?.flask === 'online' || !flask.error
  
  const components = {
    flask: flaskIsOnline ? 'online' : 'offline',
    ollama: flask.components?.ollama || (ollama.status === 'online' ? 'online' : 'offline'),
    supabase: flask.components?.supabase || (supabase.status === 'online' ? 'online' : 'offline'),
  }
  
  // Overall status - ok if at least Flask is working, or if we got good data
  const overallStatus = flask.status === 'ok' || 
                       (components.flask === 'online' || components.ollama === 'online' || components.supabase === 'online')
                        ? 'ok' 
                        : 'error'
  
  const response = NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    components,
    details: {
      flask: {
        status: components.flask,
        url: FLASK_URL,
        message: flask.message || flask.error,
      },
      ollama: {
        status: components.ollama,
        url: OLLAMA_URL,
        message: ollama.message || ollama.error,
      },
      supabase: {
        status: components.supabase,
        message: supabase.message || supabase.error,
      },
    },
    // Include full Flask response if available
    ...(flask.status === 'ok' ? flask : {}),
  }, { status: 200 })
  
  // Apply caching headers (30 second cache for health checks)
  return applyCacheHeaders(response, CacheStrategies.SHORT)
}
