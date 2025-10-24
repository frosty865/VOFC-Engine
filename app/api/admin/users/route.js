// Handles admin user CRUD. All endpoints require admin authentication.
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/auth-middleware';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get all users with multi-agency support (admin only)
export async function GET(request) {
  const { user, error } = await requireAdmin(request);
  if (error) return error;
  
  try {
    // Get current admin's agency for RLS filtering
    const { data: adminAgency } = await supabase
      .from('user_agency_relationships')
      .select('agency_id, role_id')
      .eq('user_id', user.id)
      .single();

    // Get users with their agency relationships
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select(`
        id,
        email,
        created_at,
        updated_at,
        user_agency_relationships!inner(
          agency_id,
          role_id,
          agencies!inner(
            id,
            name,
            code
          ),
          user_roles!inner(
            id,
            name,
            permissions
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    // Filter by admin's agency if not super admin
    const filteredUsers = users?.filter(user => {
      const userAgencies = user.user_agency_relationships?.map(rel => rel.agency_id) || [];
      return adminAgency?.role_id === 'super_admin' || userAgencies.includes(adminAgency?.agency_id);
    }) || [];

    return NextResponse.json({ 
      success: true, 
      users: filteredUsers,
      admin_agency: adminAgency?.agencies?.name || 'Unknown'
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load users' },
      { status: 500 }
    );
  }
}

// Create new user with multi-agency support (admin only)
export async function POST(request) {
  const { user, error } = await requireAdmin(request);
  if (error) return error;
  
  try {
    const body = await request.json();
    const { email, password, full_name, role_id, agency_id, security_clearance_level } = body;
    
    if (!email || !password || !full_name || !role_id || !agency_id) {
      return NextResponse.json(
        { success: false, error: 'Email, password, full name, role, and agency are required' },
        { status: 400 }
      );
    }

    // Get current admin's agency for authorization
    const { data: adminAgency } = await supabase
      .from('user_agency_relationships')
      .select('agency_id, role_id')
      .eq('user_id', user.id)
      .single();

    // Check if admin can create users in this agency
    if (adminAgency?.role_id !== 'super_admin' && adminAgency?.agency_id !== agency_id) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to create users in this agency' },
        { status: 403 }
      );
    }

    // Create user in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        security_clearance_level: security_clearance_level || 'public'
      }
    });

    if (authError) throw authError;

    // Create user-agency relationship
    const { data: userAgency, error: agencyError } = await supabase
      .from('user_agency_relationships')
      .insert({
        user_id: authUser.user.id,
        agency_id,
        role_id,
        security_clearance_level: security_clearance_level || 'public',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (agencyError) throw agencyError;

    // Log security audit trail
    await supabase
      .from('security_audit_trail')
      .insert({
        user_id: user.id,
        agency_id: adminAgency?.agency_id,
        action: 'user_created',
        resource_type: 'user',
        resource_id: authUser.user.id,
        details: {
          new_user_email: email,
          new_user_agency: agency_id,
          new_user_role: role_id,
          security_clearance: security_clearance_level || 'public'
        },
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        full_name,
        agency_id,
        role_id,
        security_clearance_level: security_clearance_level || 'public'
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

// Update user with multi-agency support (admin only)
export async function PUT(request) {
  const { user, error } = await requireAdmin(request);
  if (error) return error;
  
  try {
    const body = await request.json();
    const { user_id, is_active, password, role_id, agency_id, security_clearance_level, full_name, force_password_change } = body;
    
    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get current admin's agency for authorization
    const { data: adminAgency } = await supabase
      .from('user_agency_relationships')
      .select('agency_id, role_id')
      .eq('user_id', user.id)
      .single();

    // Get target user's current agency
    const { data: targetUserAgency } = await supabase
      .from('user_agency_relationships')
      .select('agency_id, role_id')
      .eq('user_id', user_id)
      .single();

    // Check if admin can modify this user
    if (adminAgency?.role_id !== 'super_admin' && 
        adminAgency?.agency_id !== targetUserAgency?.agency_id) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to modify this user' },
        { status: 403 }
      );
    }
    // Update user metadata in auth.users
    const updateData = {};
    if (full_name) updateData.user_metadata = { full_name };
    if (security_clearance_level) updateData.user_metadata = { 
      ...updateData.user_metadata, 
      security_clearance_level 
    };

    if (Object.keys(updateData).length > 0) {
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(user_id, updateData);
      if (authUpdateError) throw authUpdateError;
    }

    // Update password if provided
    if (password) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(user_id, {
        password,
        email_confirm: true
      });
      if (passwordError) throw passwordError;
    }

    // Update user-agency relationship
    const relationshipUpdateData = {};
    if (role_id) relationshipUpdateData.role_id = role_id;
    if (agency_id) relationshipUpdateData.agency_id = agency_id;
    if (security_clearance_level) relationshipUpdateData.security_clearance_level = security_clearance_level;
    if (typeof is_active !== 'undefined') relationshipUpdateData.is_active = is_active;

    if (Object.keys(relationshipUpdateData).length > 0) {
      const { error: relationshipError } = await supabase
        .from('user_agency_relationships')
        .update(relationshipUpdateData)
        .eq('user_id', user_id);
      
      if (relationshipError) throw relationshipError;
    }

    // Log security audit trail
    await supabase
      .from('security_audit_trail')
      .insert({
        user_id: user.id,
        agency_id: adminAgency?.agency_id,
        action: 'user_updated',
        resource_type: 'user',
        resource_id: user_id,
        details: {
          updated_fields: Object.keys(relationshipUpdateData),
          new_role: role_id,
          new_agency: agency_id,
          new_clearance: security_clearance_level
        },
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: `Update failed: ${error.message}` },
      { status: 500 }
    );
  }
}

// Delete user with multi-agency support (admin only)
export async function DELETE(request) {
  const { user, error } = await requireAdmin(request);
  if (error) return error;
  
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    
    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get current admin's agency for authorization
    const { data: adminAgency } = await supabase
      .from('user_agency_relationships')
      .select('agency_id, role_id')
      .eq('user_id', user.id)
      .single();

    // Get target user's current agency
    const { data: targetUserAgency } = await supabase
      .from('user_agency_relationships')
      .select('agency_id, role_id')
      .eq('user_id', user_id)
      .single();

    // Check if admin can delete this user
    if (adminAgency?.role_id !== 'super_admin' && 
        adminAgency?.agency_id !== targetUserAgency?.agency_id) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to delete this user' },
        { status: 403 }
      );
    }

    // Delete user-agency relationships first
    const { error: relationshipError } = await supabase
      .from('user_agency_relationships')
      .delete()
      .eq('user_id', user_id);

    if (relationshipError) throw relationshipError;

    // Delete user from auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(user_id);
    if (authError) throw authError;

    // Log security audit trail
    await supabase
      .from('security_audit_trail')
      .insert({
        user_id: user.id,
        agency_id: adminAgency?.agency_id,
        action: 'user_deleted',
        resource_type: 'user',
        resource_id: user_id,
        details: {
          deleted_user_agency: targetUserAgency?.agency_id,
          deleted_user_role: targetUserAgency?.role_id
        },
        created_at: new Date().toISOString()
      });

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
