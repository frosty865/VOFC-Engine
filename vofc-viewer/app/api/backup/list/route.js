import { NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/auth-server';
import { DatabaseBackupService } from '../../../../../lib/database-backup';

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
      'backup'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // List backups
    const backupService = new DatabaseBackupService();
    const result = await backupService.listBackups();

    return NextResponse.json(result);

  } catch (error) {
    console.error('Backup listing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list backups' },
      { status: 500 }
    );
  }
}

