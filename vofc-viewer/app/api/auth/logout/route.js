import { NextResponse } from 'next/server';
import { AuthService } from '../../../../lib/auth-server';

export async function POST(request) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (token) {
      await AuthService.logoutUser(token);
    }

    // Clear the authentication cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}