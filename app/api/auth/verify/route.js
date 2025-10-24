import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No authorization token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify the Supabase Auth token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Map user email to role (since we're using Supabase Auth)
    const roleMap = {
      'admin@vofc.gov': 'admin',
      'spsa@vofc.gov': 'spsa', 
      'psa@vofc.gov': 'psa',
      'analyst@vofc.gov': 'analyst'
    };

    const role = roleMap[user.email] || 'user';
    const name = user.user_metadata?.name || user.email.split('@')[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: role,
        name: name
      }
    });

  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Token verification failed' },
      { status: 401 }
    );
  }
}
