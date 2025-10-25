import { NextResponse } from 'next/server';
import { AuthService } from '../../../lib/auth-server';

export async function GET(request) {
  try {
    console.log('🔍 Auth verify endpoint called');
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    console.log('📋 Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header');
      return NextResponse.json(
        { success: false, error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🔑 Token received:', token.substring(0, 20) + '...');

    // Use the existing AuthService to verify the token
    const authResult = await AuthService.verifyToken(token);

    if (!authResult.success) {
      console.log('❌ Token verification failed:', authResult.error);
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    console.log('✅ Token verified for user:', authResult.user.email);

    return NextResponse.json({
      success: true,
      user: authResult.user
    });

  } catch (error) {
    console.error('❌ Auth verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}