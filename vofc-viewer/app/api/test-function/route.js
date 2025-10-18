import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Call your Supabase Edge Function
    const response = await fetch(
      `https://wivohgbuuwxoyfyzntsd.supabase.co/functions/v1/generate-question-i18n`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const result = await response.json();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Function call error:', error);
    return NextResponse.json(
      { error: 'Failed to call function' },
      { status: 500 }
    );
  }
}

