'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
// Removed localStorage dependencies - now using secure server-side authentication
import '../styles/cisa.css';

export default function Navigation() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('🔐 Navigation - User loaded:', result.user);
          setCurrentUser(result.user);
        }
      } else {
        console.log('🔐 Navigation - Auth failed:', response.status);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setCurrentUser(null);
        window.location.href = '/splash';
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="header" style={{
      background: 'linear-gradient(135deg, var(--cisa-blue) 0%, var(--cisa-blue-light) 100%)',
      color: 'var(--cisa-white)',
      padding: 'var(--spacing-lg) 0',
      boxShadow: 'var(--shadow-md)',
      borderBottom: '3px solid var(--cisa-blue-lighter)',
      marginBottom: 'var(--spacing-lg)',
      fontFamily: 'var(--font-family)'
    }}>
      <div className="header-content" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 var(--spacing-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo Section */}
        <div className="logo" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-md)'
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <img
              src="/images/cisa-logo.png"
              alt="CISA Logo"
              style={{ height: '40px', width: 'auto', marginRight: 'var(--spacing-md)' }}
            />
            <div className="logo-text">
              <h1 style={{
                margin: '0',
                fontSize: 'var(--font-size-xl)',
                fontWeight: '700',
                color: 'var(--cisa-white)'
              }}>
                VOFC Engine
              </h1>
              <p style={{
                margin: '0',
                fontSize: 'var(--font-size-sm)',
                opacity: '0.9',
                color: 'var(--cisa-white)'
              }}>
                Vulnerabilities and Options for Consideration
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', gap: 'var(--spacing-lg)', alignItems: 'center' }}>
          <Link
            href="/"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--border-radius)',
              textDecoration: 'none',
              color: pathname === '/' ? 'var(--cisa-white)' : 'rgba(255,255,255,0.8)',
              backgroundColor: pathname === '/' ? 'rgba(255,255,255,0.2)' : 'transparent',
              fontWeight: '600',
              fontSize: 'var(--font-size-sm)',
              transition: 'all 0.3s ease',
              border: '2px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (pathname !== '/') {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.target.style.color = 'var(--cisa-white)';
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== '/') {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = 'rgba(255,255,255,0.8)';
              }
            }}
          >
            📊 Dashboard
          </Link>
          <Link
            href="/submit"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--border-radius)',
              textDecoration: 'none',
              color: pathname === '/submit' ? 'var(--cisa-white)' : 'rgba(255,255,255,0.8)',
              backgroundColor: pathname === '/submit' ? 'rgba(255,255,255,0.2)' : 'transparent',
              fontWeight: '600',
              fontSize: 'var(--font-size-sm)',
              transition: 'all 0.3s ease',
              border: '2px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (pathname !== '/submit') {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.target.style.color = 'var(--cisa-white)';
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== '/submit') {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = 'rgba(255,255,255,0.8)';
              }
            }}
          >
            📝 Submit VOFC
          </Link>
          <Link
            href="/submit/bulk"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--border-radius)',
              textDecoration: 'none',
              color: pathname === '/submit/bulk' ? 'var(--cisa-white)' : 'rgba(255,255,255,0.8)',
              backgroundColor: pathname === '/submit/bulk' ? 'rgba(255,255,255,0.2)' : 'transparent',
              fontWeight: '600',
              fontSize: 'var(--font-size-sm)',
              transition: 'all 0.3s ease',
              border: '2px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (pathname !== '/submit/bulk') {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.target.style.color = 'var(--cisa-white)';
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== '/submit/bulk') {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = 'rgba(255,255,255,0.8)';
              }
            }}
          >
            📁 Bulk Submit
          </Link>
          <Link
            href="/profile"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--border-radius)',
              textDecoration: 'none',
              color: pathname === '/profile' ? 'var(--cisa-white)' : 'rgba(255,255,255,0.8)',
              backgroundColor: pathname === '/profile' ? 'rgba(255,255,255,0.2)' : 'transparent',
              fontWeight: '600',
              fontSize: 'var(--font-size-sm)',
              transition: 'all 0.3s ease',
              border: '2px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (pathname !== '/profile') {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.target.style.color = 'var(--cisa-white)';
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== '/profile') {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = 'rgba(255,255,255,0.8)';
              }
            }}
          >
            👤 My Profile
          </Link>
          {currentUser && (currentUser.role === 'admin' || currentUser.role === 'spsa') && (
            <>
              <Link
                href="/admin"
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  borderRadius: 'var(--border-radius)',
                  textDecoration: 'none',
                  color: pathname === '/admin' ? 'var(--cisa-white)' : 'rgba(255,255,255,0.8)',
                  backgroundColor: pathname === '/admin' ? 'rgba(255,255,255,0.2)' : 'transparent',
                  fontWeight: '600',
                  fontSize: 'var(--font-size-sm)',
                  transition: 'all 0.3s ease',
                  border: '2px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (pathname !== '/admin') {
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    e.target.style.color = 'var(--cisa-white)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== '/admin') {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = 'rgba(255,255,255,0.8)';
                  }
                }}
              >
                ⚙️ Admin Panel
              </Link>
              {currentUser.role === 'admin' && (
                <Link
                  href="/admin/ofcs"
                  style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderRadius: 'var(--border-radius)',
                    textDecoration: 'none',
                    color: pathname === '/admin/ofcs' ? 'var(--cisa-white)' : 'rgba(255,255,255,0.8)',
                    backgroundColor: pathname === '/admin/ofcs' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    fontWeight: '600',
                    fontSize: 'var(--font-size-sm)',
                    transition: 'all 0.3s ease',
                    border: '2px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (pathname !== '/admin/ofcs') {
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                      e.target.style.color = 'var(--cisa-white)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (pathname !== '/admin/ofcs') {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = 'rgba(255,255,255,0.8)';
                    }
                  }}
                >
                  💡 Manage OFCs
                </Link>
              )}
            </>
          )}
        </nav>

        {/* User Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          {!loading && currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: '600',
                  color: 'var(--cisa-white)'
                }}>
                  {currentUser.full_name}
                </div>
                <div style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'rgba(255,255,255,0.8)',
                  textTransform: 'capitalize'
                }}>
                  {currentUser.role}
                </div>
              </div>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(255,255,255,0.3)'
              }}>
                <span style={{
                  color: 'var(--cisa-white)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: '600'
                }}>
                  {currentUser.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'var(--cisa-white)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: 'var(--border-radius)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: 'var(--font-family)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
