'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client.js';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'validator',
    agency: ''
  });

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'spsa': return 'bg-red-100 text-red-800';
      case 'psa': return 'bg-blue-100 text-blue-800';
      case 'validator': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin': return 'System Administrator';
      case 'spsa': return 'Supervisory PSA Admin';
      case 'psa': return 'Protective Security Advisor';
      case 'validator': return 'Validator Analyst';
      default: return role;
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vofc_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data);
    } catch (error) {
      alert(`Error fetching users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUser = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) return;

      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionToken })
      });

      const result = await response.json();
      if (result.valid) {
        setCurrentUser(result.user);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    // Role validation - only admin can change roles
    if (currentUser.role !== 'admin') {
      throw new Error('Unauthorized role change');
    }

    if (newRole === 'admin' && currentUser.role !== 'admin') {
      throw new Error('Cannot assign admin role');
    }

    try {
      const { error } = await supabase
        .from('vofc_users')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      alert(`User role updated to ${getRoleDisplayName(newRole)}`);
      await fetchUsers();
    } catch (error) {
      alert(`Failed to update role: ${error.message}`);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    if (currentUser.role !== 'admin') {
      alert('Only system administrators can modify user status');
      return;
    }

    try {
      const { error } = await supabase
        .from('vofc_users')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      alert(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
      await fetchUsers();
    } catch (error) {
      alert(`Failed to update status: ${error.message}`);
    }
  };

  const addNewUser = async (e) => {
    e.preventDefault();
    
    if (currentUser.role !== 'admin') {
      alert('Only system administrators can add users');
      return;
    }

    try {
      const response = await fetch('/api/admin/add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      const result = await response.json();

      if (result.success) {
        alert('User created successfully');
        setNewUser({ username: '', password: '', full_name: '', role: 'validator', agency: '' });
        setShowAddForm(false);
        await fetchUsers();
      } else {
        alert(`Failed to create user: ${result.error}`);
      }
    } catch (error) {
      alert(`Failed to create user: ${error.message}`);
    }
  };

  const resetUserPassword = async (userId) => {
    if (currentUser.role !== 'admin') {
      alert('Only system administrators can reset passwords');
      return;
    }

    if (!confirm('Are you sure you want to reset this user\'s password?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });

      const result = await response.json();

      if (result.success) {
        alert(`Password reset successful. New password: ${result.new_password}`);
      } else {
        alert(`Failed to reset password: ${result.error}`);
      }
    } catch (error) {
      alert(`Failed to reset password: ${error.message}`);
    }
  };

  useEffect(() => {
    getCurrentUser();
    fetchUsers();
  }, []);

  if (loading) return (
    <div className="alert alert-info">
      <p>Loading users...</p>
    </div>
  );

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="alert alert-danger">
        <h6>Access Denied</h6>
        <p>Only system administrators can access user management.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title">User Management</h5>
        <p className="text-secondary">Manage VOFC system users and permissions</p>
      </div>
      <div className="card-body">
        {/* Add User Button */}
        <div className="text-end mb-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary"
          >
            {showAddForm ? 'Cancel' : 'Add New User'}
          </button>
        </div>

        {/* Add User Form */}
        {showAddForm && (
          <div className="card bg-light mb-4">
            <div className="card-header">
              <h6 className="card-title">Add New User</h6>
            </div>
            <div className="card-body">
              <form onSubmit={addNewUser}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="form-label">Username</label>
                      <input
                        type="text"
                        className="form-input"
                        value={newUser.username}
                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <input
                        type="password"
                        className="form-input"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={newUser.full_name}
                        onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select
                        className="form-select"
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      >
                        <option value="validator">Validator Analyst</option>
                        <option value="psa">Protective Security Advisor</option>
                        <option value="spsa">Supervisory PSA Admin</option>
                        <option value="admin">System Administrator</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Agency</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newUser.agency}
                    onChange={(e) => setNewUser({...newUser, agency: e.target.value})}
                    placeholder="e.g., CISA Region 4"
                  />
                </div>

                <div className="text-end">
                  <button type="submit" className="btn btn-success">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td>
                    <div>
                      <strong>{user.full_name}</strong>
                      <br />
                      <small className="text-secondary">@{user.username}</small>
                      {user.agency && (
                        <br />
                        <small className="text-info">{user.agency}</small>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getRoleColor(user.role)}`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.is_active ? 'bg-success' : 'bg-danger'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {user.last_login ? 
                      new Date(user.last_login).toLocaleDateString() : 
                      'Never'
                    }
                  </td>
                  <td>
                    <div className="btn-group" role="group">
                      <select
                        className="form-select form-select-sm"
                        value={user.role}
                        onChange={(e) => updateUserRole(user.user_id, e.target.value)}
                        disabled={user.user_id === currentUser.user_id}
                      >
                        <option value="validator">Validator</option>
                        <option value="psa">PSA</option>
                        <option value="spsa">SPSA</option>
                        <option value="admin">Admin</option>
                      </select>
                      
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => toggleUserStatus(user.user_id, user.is_active)}
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {user.is_active ? '⏸️' : '▶️'}
                      </button>
                      
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => resetUserPassword(user.user_id)}
                        title="Reset Password"
                      >
                        🔑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="row mt-4">
          <div className="col-md-3">
            <div className="card bg-light">
              <div className="card-body text-center">
                <h4 className="text-primary">{users.length}</h4>
                <p className="mb-0">Total Users</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-light">
              <div className="card-body text-center">
                <h4 className="text-success">{users.filter(u => u.is_active).length}</h4>
                <p className="mb-0">Active Users</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-light">
              <div className="card-body text-center">
                <h4 className="text-warning">{users.filter(u => u.role === 'admin').length}</h4>
                <p className="mb-0">System Admins</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-light">
              <div className="card-body text-center">
                <h4 className="text-info">{users.filter(u => u.role === 'validator').length}</h4>
                <p className="mb-0">Validators</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


