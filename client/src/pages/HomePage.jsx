import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    userName: '',
    userMobile: '',
    userEmail: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'userMobile') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({
        ...prev,
        [name]: digitsOnly,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.userName.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }

    if (formData.userMobile.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit details.');
      }

      navigate(`/greeting/${data.jobId}`);
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 140px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Simple Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{
            fontSize: '1.85rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: '8px',
          }}>
            Welcome
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Enter your details below to receive your personalized video greeting.
          </p>
        </div>

        {/* Clean, Simple Form Card */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          {errorMsg && (
            <div style={{
              background: 'var(--danger-bg)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              color: 'var(--danger)',
              fontSize: '0.88rem',
              marginBottom: '20px',
            }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="userName">
                Full Name
              </label>
              <input
                id="userName"
                name="userName"
                type="text"
                className="form-input"
                placeholder="Enter your name"
                value={formData.userName}
                onChange={handleChange}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="userMobile">
                Mobile Number
              </label>
              <input
                id="userMobile"
                name="userMobile"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]{10}"
                className="form-input"
                placeholder="Enter 10-digit mobile number"
                value={formData.userMobile}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="userEmail">
                Email Address <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                id="userEmail"
                name="userEmail"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={formData.userEmail}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              id="generate-greeting-btn"
              className="btn-primary"
              disabled={isSubmitting}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '14px',
                fontSize: '0.98rem',
              }}
            >
              {isSubmitting ? 'Processing...' : 'Submit & Watch Greeting'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
