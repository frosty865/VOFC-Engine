import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('✅ User logged out');

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear the JWT cookie
    response.cookies.delete('auth-token');

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
