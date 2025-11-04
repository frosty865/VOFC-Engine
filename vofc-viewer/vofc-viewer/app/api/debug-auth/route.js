import { NextResponse } from 'next/server';
import { AuthService } from '../../lib/auth-server';

export async function GET(request) {
  try {
    // Get auth token from cookies
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'No auth token found',
        debug: {
          cookies: request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
        }
      });
    }

    // Verify token
    const authResult = await AuthService.verifyToken(token);
    
    return NextResponse.json({
      success: true,
      authResult,
      debug: {
        tokenLength: token.length,
        tokenStart: token.substring(0, 20) + '...',
        hasToken: !!token
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      debug: {
        errorType: error.constructor.name
      }
    });
  }
}
