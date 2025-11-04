import { NextResponse } from 'next/server';
import { AuthService } from '../../../lib/auth-server';
import { monitoring } from '../../../lib/monitoring';

export async function GET(request) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const verificationResult = await AuthService.verifyToken(token);

    if (!verificationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Check if user has admin permissions
    const hasPermission = await AuthService.checkPermission(
      verificationResult.user.id,
      'admin',
      'monitoring'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const metrics = monitoring.getMetrics();
    const recentAlerts = monitoring.getRecentAlerts(20);
    const healthChecks = await monitoring.runHealthChecks();

    return NextResponse.json({
      success: true,
      metrics,
      recentAlerts,
      healthChecks,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Metrics retrieval failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}

