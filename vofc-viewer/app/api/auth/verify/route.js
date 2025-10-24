import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Secret key for JWT verification (must match the one used for signing)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
);

export async function GET(request) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No authentication token' },
        { status: 401 }
      );
    }

    // Verify and decode the JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Check if token is expired (JWT handles this automatically)
    if (!payload || !payload.email) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        name: payload.name
      }
    });

  } catch (error) {
    console.error('JWT verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Token verification failed' },
      { status: 401 }
    );
  }
}
