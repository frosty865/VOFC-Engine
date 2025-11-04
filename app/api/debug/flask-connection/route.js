import { NextResponse } from 'next/server';
import { getFlaskUrl, safeFetch } from '@/app/lib/server-utils';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to test Flask connection and tunnel
 */
export async function GET() {
  const flaskUrl = getFlaskUrl();
  
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      detectedUrl: flaskUrl,
      envVars: {
        NEXT_PUBLIC_FLASK_API_URL: process.env.NEXT_PUBLIC_FLASK_API_URL || 'not set',
        NEXT_PUBLIC_FLASK_URL: process.env.NEXT_PUBLIC_FLASK_URL || 'not set',
        FLASK_URL: process.env.FLASK_URL || 'not set',
        NEXT_PUBLIC_OLLAMA_SERVER_URL: process.env.NEXT_PUBLIC_OLLAMA_SERVER_URL || 'not set',
        OLLAMA_SERVER_URL: process.env.OLLAMA_SERVER_URL || 'not set',
      },
    },
    tests: [],
  };

  // Test 1: Basic health endpoint
  try {
    const healthResult = await safeFetch(`${flaskUrl}/api/health`, {
      timeout: 5000,
    });
    results.tests.push({
      name: 'Health Endpoint (/api/health)',
      url: `${flaskUrl}/api/health`,
      success: healthResult.success,
      statusCode: healthResult.statusCode,
      error: healthResult.error,
      data: healthResult.data ? { status: healthResult.data.status } : null,
    });
  } catch (err) {
    results.tests.push({
      name: 'Health Endpoint (/api/health)',
      url: `${flaskUrl}/api/health`,
      success: false,
      error: err.message,
      exception: true,
    });
  }

  // Test 2: System health endpoint
  try {
    const systemHealthResult = await safeFetch(`${flaskUrl}/api/system/health`, {
      timeout: 5000,
    });
    results.tests.push({
      name: 'System Health Endpoint (/api/system/health)',
      url: `${flaskUrl}/api/system/health`,
      success: systemHealthResult.success,
      statusCode: systemHealthResult.statusCode,
      error: systemHealthResult.error,
      data: systemHealthResult.data ? {
        status: systemHealthResult.data.status,
        components: systemHealthResult.data.components,
      } : null,
    });
  } catch (err) {
    results.tests.push({
      name: 'System Health Endpoint (/api/system/health)',
      url: `${flaskUrl}/api/system/health`,
      success: false,
      error: err.message,
      exception: true,
    });
  }

  // Test 3: Progress endpoint
  try {
    const progressResult = await safeFetch(`${flaskUrl}/api/progress`, {
      timeout: 5000,
    });
    results.tests.push({
      name: 'Progress Endpoint (/api/progress)',
      url: `${flaskUrl}/api/progress`,
      success: progressResult.success,
      statusCode: progressResult.statusCode,
      error: progressResult.error,
      data: progressResult.data ? { status: progressResult.data.status } : null,
    });
  } catch (err) {
    results.tests.push({
      name: 'Progress Endpoint (/api/progress)',
      url: `${flaskUrl}/api/progress`,
      success: false,
      error: err.message,
      exception: true,
    });
  }

  // Summary
  const successCount = results.tests.filter(t => t.success).length;
  const failureCount = results.tests.filter(t => !t.success).length;
  
  results.summary = {
    total: results.tests.length,
    successful: successCount,
    failed: failureCount,
    tunnelStatus: successCount > 0 ? 'working' : 'not working',
  };

  return NextResponse.json(results, { status: 200 });
}

