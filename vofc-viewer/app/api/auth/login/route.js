import { NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

// Secret key for JWT signing (in production, use a secure random key)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
);

// Valid users (in production, this would come from a database)
const validUsers = [
  { email: 'admin@vofc.gov', password: 'Admin123!', role: 'admin', name: 'Administrator' },
  { email: 'spsa@vofc.gov', password: 'Admin123!', role: 'spsa', name: 'Senior PSA' },
  { email: 'psa@vofc.gov', password: 'Admin123!', role: 'psa', name: 'PSA' },
  { email: 'analyst@vofc.gov', password: 'Admin123!', role: 'analyst', name: 'Analyst' }
];

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    console.log('🔐 Login attempt for:', email);

    // Find user
    const user = validUsers.find(u => u.email === email && u.password === password);

    if (!user) {
      console.log('❌ Invalid credentials for:', email);
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT token with encrypted payload
    const token = await new SignJWT({
      userId: user.email,
      email: user.email,
      role: user.role,
      name: user.name,
      iat: Math.floor(Date.now() / 1000)
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    console.log('✅ Login successful for:', email, 'Role:', user.role);

    // Set encrypted JWT cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.email,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });

    response.cookies.set('auth-token', token, {
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
