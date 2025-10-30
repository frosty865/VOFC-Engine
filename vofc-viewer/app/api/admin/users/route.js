// Handles admin user CRUD. All endpoints require admin authentication.
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/auth-middleware';
import { supabaseAdmin } from '@/lib/supabase-client.js';
import bcrypt from 'bcryptjs';

// Get all users (admin only)
function authErrorResponse(error) {
  const msg = String(error || 'Unauthorized');
  const status = msg.includes('Authentication') ? 401 : 403;
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function GET(request) {
  const { user, error } = await requireAdmin(request);
  if (error) return authErrorResponse(error);
  try {
    // 1) List all auth users (service role bypasses RLS)
    const { data: authList, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw listErr;
    const authUsers = authList?.users || [];

    // 2) Load profiles for these users
    const ids = authUsers.map(u => u.id);
    let profiles = [];
    if (ids.length > 0) {
      const { data: profData, error: profErr } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, role, group, is_admin')
        .in('id', ids);
      if (profErr) throw profErr;
      profiles = profData || [];
    }

    // 3) Merge
    const profileById = new Map(profiles.map(p => [p.id, p]));
    const merged = authUsers.map(u => {
      const p = profileById.get(u.id) || {};
      const derivedRole = String(p.role || p.group || (p.is_admin ? 'admin' : '') || u.user_metadata?.role || 'user').toLowerCase();
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        role: derivedRole,
        full_name: p.full_name || u.user_metadata?.name || u.email,
        is_admin: Boolean(p.is_admin)
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ success: true, users: merged });
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
  const { user, error } = await requireAdmin(request);
  if (error) return authErrorResponse(error);
  try {
    const body = await request.json();
    const { username, password, full_name, role, agency } = body;
    if (!username || !password || !full_name || !role) {
      return NextResponse.json(
        { success: false, error: 'Username, password, full name, and role are required' },
        { status: 400 }
      );
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabaseAdmin
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
    if (error) throw error;
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
  const { user, error } = await requireAdmin(request);
  if (error) return authErrorResponse(error);
  try {
    const body = await request.json();
    const { user_id, is_active, password, role, force_password_change, full_name, agency, username } = body;
    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    const updateData = {};
    if (typeof is_active !== 'undefined') updateData.is_active = is_active;
    if (role) updateData.role = role;
    if (full_name) updateData.full_name = full_name;
    if (agency) updateData.agency = agency;
    if (username) updateData.username = username;
    if (typeof force_password_change !== 'undefined') updateData.force_password_change = force_password_change;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      updateData.password_hash = hashedPassword;
      updateData.force_password_change = false;
    }
    const { data: user, error } = await supabaseAdmin
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
  const { user, error } = await requireAdmin(request);
  if (error) return authErrorResponse(error);
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    // Delete user sessions
    await supabaseAdmin
      .from('user_sessions')
      .delete()
      .eq('user_id', user_id);
    // Delete user
    const { error } = await supabaseAdmin
      .from('vofc_users')
      .delete()
      .eq('user_id', user_id);
    if (error) throw error;
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
