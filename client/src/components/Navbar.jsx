import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Video, ShieldCheck, Cpu } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const [systemStatus, setSystemStatus] = useState('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'online') setSystemStatus('online');
        else setSystemStatus('degraded');
      })
      .catch(() => setSystemStatus('offline'));
  }, []);

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      backgroundColor: 'rgba(8, 11, 19, 0.75)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
          }}>
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '1.25rem',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span>Sanrachana</span>
              <span className="gradient-text">AI</span>
            </div>
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontWeight: 500,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              Personalized Video Greetings
            </div>
          </div>
        </Link>

        {/* Navigation Actions */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Status Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
          }}>
            <Cpu size={14} color="var(--accent-secondary)" />
            <span>Modal GPU</span>
            <span
              className="pulse-circle"
              style={{
                backgroundColor:
                  systemStatus === 'online'
                    ? 'var(--success)'
                    : systemStatus === 'offline'
                    ? 'var(--danger)'
                    : 'var(--warning)',
              }}
            />
          </div>

          <Link
            to="/"
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: location.pathname === '/' ? 'var(--text-primary)' : 'var(--text-muted)',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              transition: 'color 0.2s',
            }}
          >
            Create Greeting
          </Link>

          <Link
            to="/admin"
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: location.pathname.startsWith('/admin') ? 'var(--accent-primary)' : 'var(--text-muted)',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              background: location.pathname.startsWith('/admin') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              border: location.pathname.startsWith('/admin') ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <ShieldCheck size={16} />
            <span>Admin Studio</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
