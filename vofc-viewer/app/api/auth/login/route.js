import { NextResponse } from 'next/server';
import { AuthService } from '../../../../lib/auth-server';
import { SecurityUtils } from '../../../../lib/security';

// Rate limiting
const rateLimiter = SecurityUtils.createRateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes

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

    // Sanitize inputs
    const sanitizedUsername = SecurityUtils.sanitizeInput(username);
    const sanitizedPassword = SecurityUtils.sanitizeInput(password);

    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    if (!rateLimiter(clientIP)) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Authenticate user
    const authResult = await AuthService.authenticateUser(sanitizedUsername, sanitizedPassword);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

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