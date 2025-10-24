import { NextResponse } from 'next/server';

export async function GET(request) {
  return NextResponse.json({
    message: 'Simple test endpoint working',
    timestamp: new Date().toISOString(),
    method: 'GET',
    url: request.url
  });
}

export async function POST(request) {
  const body = await request.text();
  return NextResponse.json({
    message: 'Simple test endpoint working',
    timestamp: new Date().toISOString(),
    method: 'POST',
    bodyLength: body.length,
    hasBody: body.length > 0
  });
}
