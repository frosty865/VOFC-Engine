import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';

// Simple rate limiting
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Simple input validation
    if (username.length > 100 || password.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid input length' },
        { status: 400 }
      );
    }

    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const now = Date.now();
    const attempts = loginAttempts.get(clientIP) || [];
    const validAttempts = attempts.filter(time => now - time < WINDOW_MS);
    
    if (validAttempts.length >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Add current attempt
    validAttempts.push(now);
    loginAttempts.set(clientIP, validAttempts);

    // Authenticate user with Supabase
    const { data: user, error } = await supabase
      .from('vofc_users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Simple password check (in production, use proper hashing)
    if (user.password !== password) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const authResult = {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      },
      sessionId: user.id,
      token: 'mock-token-' + Date.now()
    };

    // AuthResult is already successful at this point

    // Set secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: authResult.user,
      sessionId: authResult.sessionId
    });

    // Set secure, HTTP-only cookie
    response.cookies.set('auth-token', authResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}