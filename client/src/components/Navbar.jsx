import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      backgroundColor: 'rgba(7, 11, 20, 0.85)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '1.15rem',
            letterSpacing: '-0.01em',
            color: '#ffffff',
          }}>
            Video Greeting
          </span>
        </Link>

        {/* Navigation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link
            to="/"
            style={{
              fontSize: '0.9rem',
              fontWeight: 500,
              color: location.pathname === '/' ? '#ffffff' : 'var(--text-muted)',
              transition: 'color 0.2s',
            }}
          >
            Home
          </Link>

          {/* Admin badge only visible when directly on /admin */}
          {location.pathname.startsWith('/admin') && (
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--accent-primary)',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '4px 10px',
                borderRadius: '6px',
                letterSpacing: '0.02em',
              }}
            >
              Admin Mode
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
