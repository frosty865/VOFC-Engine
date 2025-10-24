'use client';

import { useState } from 'react';

export default function LoginForm() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.user);
        // Store session token in localStorage
        localStorage.setItem('session_token', result.session_token);
        localStorage.setItem('user', JSON.stringify(result.user));
        alert(`Welcome, ${result.user.full_name}!`);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      setError(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    setUser(null);
    setFormData({ username: '', password: '' });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (user) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="card-title">Welcome, {user.full_name}!</h5>
        </div>
        <div className="card-body">
          <div className="alert alert-success">
            <p><strong>Role:</strong> {user.role}</p>
            <p><strong>Agency:</strong> {user.agency || 'N/A'}</p>
            <p><strong>Username:</strong> {user.username}</p>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title">VOFC User Login</h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <div className="text-center">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>

        <div className="alert alert-info mt-3">
          <h6>Test Users:</h6>
          <ul className="mb-0">
            <li><strong>frosty865</strong> - System Administrator (God User)</li>
            <li><strong>spsa_admin</strong> - Supervisory PSA Admin</li>
            <li><strong>psa_field</strong> - Protective Security Advisor</li>
            <li><strong>validator_user</strong> - Validator Analyst</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
