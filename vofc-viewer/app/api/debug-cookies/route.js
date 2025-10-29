import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const cookies = cookieHeader ? cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {}) : {};

    return NextResponse.json({
      success: true,
      debug: {
        cookieHeader: cookieHeader || 'No cookies',
        cookies: cookies,
        hasAccessToken: !!cookies['sb-access-token'],
        hasRefreshToken: !!cookies['sb-refresh-token'],
        allCookieKeys: Object.keys(cookies)
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
