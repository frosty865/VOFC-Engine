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
    const { email, password, action } = await request.json();

    // Handle signup action
    if (action === 'signup') {
      // For signup, we'll just validate the credentials and create a session
      // In a real app, you'd create a new user in the database
      const user = validUsers.find(u => u.email === email);
      
      if (user) {
        return NextResponse.json(
          { success: false, error: 'User already exists' },
          { status: 400 }
        );
      }
      
      // For demo purposes, we'll allow any email@vofc.gov to signup
      if (email.endsWith('@vofc.gov')) {
        // Create a temporary user for signup
        const tempUser = {
          email: email,
          password: password,
          role: 'analyst', // Default role for new users
          name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)
        };
        
        // Add to valid users (in production, this would be saved to database)
        validUsers.push(tempUser);
        
        // Create JWT token for the new user
        const token = await new SignJWT({
          userId: tempUser.email,
          email: tempUser.email,
          role: tempUser.role,
          name: tempUser.name,
          iat: Math.floor(Date.now() / 1000)
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('24h')
          .sign(JWT_SECRET);

        // Set encrypted JWT cookie
        const response = NextResponse.json({
          success: true,
          user: {
            id: tempUser.email,
            email: tempUser.email,
            role: tempUser.role,
            name: tempUser.name
          }
        });

        response.cookies.set('auth-token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60, // 24 hours
          path: '/'
        });

        return response;
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid email domain. Use @vofc.gov' },
          { status: 400 }
        );
      }
    }

    // Handle login action (default)
    // Find user
    const user = validUsers.find(u => u.email === email && u.password === password);

    if (!user) {
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
      sameSite: 'lax',
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
