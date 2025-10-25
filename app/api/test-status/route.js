import { NextResponse } from 'next/server';
import { getServerClient } from '../../lib/supabase-manager';

export async function GET(request) {
  try {
    // Test database connection
    const supabaseServer = getServerClient();
    const dbStatus = supabaseServer ? 'Connected' : 'Failed';
    
    // Test environment variables
    const envStatus = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      OLLAMA_URL: !!process.env.OLLAMA_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
    };
    
    // Test authentication
    const token = request.cookies.get('auth-token')?.value;
    const authStatus = token ? 'Token present' : 'No token';
    
    return NextResponse.json({
      success: true,
      status: {
        database: dbStatus,
        environment: envStatus,
        authentication: authStatus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
