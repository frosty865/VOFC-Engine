import { NextResponse } from 'next/server';
import { AuthService } from '../../../../lib/auth-server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get all users (admin only)
export async function GET(request) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const authResult = await AuthService.verifyToken(token);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all users from vofc_users table
    const { data: users, error } = await supabase
      .from('vofc_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      users: users || []
    });

  } catch (error) {
    console.error('Error getting users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load users' },
      { status: 500 }
    );
  }
}

// Create new user (admin only)
export async function POST(request) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const authResult = await AuthService.verifyToken(token);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, full_name, role, agency } = body;

    // Validate required fields
    if (!username || !password || !full_name || !role) {
      return NextResponse.json(
        { success: false, error: 'Username, password, full name, and role are required' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const { data: user, error } = await supabase
      .from('vofc_users')
      .insert({
        username,
        password_hash: hashedPassword,
        full_name,
        role,
        agency: agency || 'CISA',
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        agency: user.agency,
        is_active: user.is_active,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// Update user (admin only)
export async function PUT(request) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const authResult = await AuthService.verifyToken(token);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log('Update user request body:', body);
    
    const { 
      user_id, 
      is_active, 
      password, 
      role, 
      force_password_change,
      full_name,
      agency,
      username
    } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData = {};
    
    if (typeof is_active !== 'undefined') {
      updateData.is_active = is_active;
    }
    
    if (role) {
      updateData.role = role;
    }
    
    if (full_name) {
      updateData.full_name = full_name;
    }
    
    if (agency) {
      updateData.agency = agency;
    }
    
    if (username) {
      updateData.username = username;
    }
    
    if (typeof force_password_change !== 'undefined') {
      updateData.force_password_change = force_password_change;
    }
    
    // Handle password update
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      updateData.password_hash = hashedPassword;
      // Reset force password change when password is manually changed
      updateData.force_password_change = false;
    }

    // Update user
    console.log('Updating user with data:', updateData);
    const { data: user, error } = await supabase
      .from('vofc_users')
      .update(updateData)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      return NextResponse.json(
        { success: false, error: `Database update failed: ${error.message}` },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        agency: user.agency,
        is_active: user.is_active,
        force_password_change: user.force_password_change
      }
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: `Update failed: ${error.message}` },
      { status: 500 }
    );
  }
}

// Delete user (admin only)
export async function DELETE(request) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const authResult = await AuthService.verifyToken(token);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Delete user sessions first
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', user_id);

    // Delete user
    const { error } = await supabase
      .from('vofc_users')
      .delete()
      .eq('user_id', user_id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
