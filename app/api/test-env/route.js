import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      OLLAMA_URL: !!process.env.OLLAMA_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
    };
    
    console.log('🔍 Environment Variables Check:', envCheck);
    
    return NextResponse.json({
      success: true,
      environment: envCheck,
      message: 'Environment variables check completed'
    });
    
  } catch (error) {
    console.error('❌ Environment check error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
