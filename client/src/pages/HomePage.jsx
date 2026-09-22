import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  User,
  Phone,
  Mail,
  ArrowRight,
  Play,
  Volume2,
  CheckCircle,
  Zap,
  Shield,
  Film,
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    userName: '',
    userMobile: '',
    userEmail: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [template, setTemplate] = useState('Hello {name}! Thank you for connecting with Sanrachana. We are thrilled to welcome you to our community!');

  useEffect(() => {
    fetch('/api/admin/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config?.greetingTemplate) {
          setTemplate(data.config.greetingTemplate);
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.userName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!formData.userMobile.trim() || formData.userMobile.trim().length < 8) {
      setErrorMsg('Please enter a valid mobile number (at least 8 digits).');
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
        throw new Error(data.error || 'Failed to submit greeting request.');
      }

      // Navigate to personalized greeting progress & playback page
      navigate(`/greeting/${data.jobId}`);
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please check your connection.');
      setIsSubmitting(false);
    }
  };

  const previewScript = template.replace(/\{name\}/gi, formData.userName.trim() || 'Friend');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
      {/* Top Banner Tag */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 18px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--accent-gradient-subtle)',
          border: '1px solid var(--border-glow)',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--accent-primary)',
        }}>
          <Sparkles size={16} />
          <span>$0 Lip-Sync Cost Architecture • Powered by Open-Source Wav2Lip</span>
        </div>
      </div>

      {/* Main Grid: Form + Realtime Preview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '40px',
        alignItems: 'start',
      }}>
        {/* Left Column: Headline & Entry Form */}
        <div>
          <h1 style={{
            fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
            letterSpacing: '-0.03em',
            marginBottom: '16px',
          }}>
            Personalized <span className="gradient-text">AI Video Greetings</span> Delivered Instantly
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '1.08rem',
            lineHeight: 1.6,
            marginBottom: '32px',
          }}>
            Experience hyper-realistic personalized video greetings with an authentic cloned voice
            and flawless lip synchronization generated in real time on serverless GPU.
          </p>

          <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} color="var(--accent-primary)" />
              <span>Get Your Custom Greeting</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '24px' }}>
              Fill in your details below to generate your personalized talking video.
            </p>

            {errorMsg && (
              <div style={{
                background: 'var(--danger-bg)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                color: 'var(--danger)',
                fontSize: '0.9rem',
                marginBottom: '20px',
              }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Name input */}
              <div className="form-group">
                <label className="form-label" htmlFor="userName">
                  <User size={15} />
                  <span>Your Full Name *</span>
                </label>
                <input
                  id="userName"
                  name="userName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Osama"
                  value={formData.userName}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Mobile input */}
              <div className="form-group">
                <label className="form-label" htmlFor="userMobile">
                  <Phone size={15} />
                  <span>Mobile Number (for WhatsApp delivery) *</span>
                </label>
                <input
                  id="userMobile"
                  name="userMobile"
                  type="tel"
                  className="form-input"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.userMobile}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Email input */}
              <div className="form-group">
                <label className="form-label" htmlFor="userEmail">
                  <Mail size={15} />
                  <span>Email Address (Optional)</span>
                </label>
                <input
                  id="userEmail"
                  name="userEmail"
                  type="email"
                  className="form-input"
                  placeholder="e.g. osama@example.com"
                  value={formData.userEmail}
                  onChange={handleChange}
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                id="generate-greeting-btn"
                className="btn-primary"
                disabled={isSubmitting}
                style={{ width: '100%', marginTop: '12px', padding: '16px' }}
              >
                {isSubmitting ? (
                  <>
                    <span className="pulse-circle" style={{ background: '#ffffff' }} />
                    <span>Initiating Pipeline...</span>
                  </>
                ) : (
                  <>
                    <span>Generate My AI Video Greeting</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Interactive Live Preview & Feature Highlights */}
        <div>
          {/* Live Script Card */}
          <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
                <Volume2 size={18} color="var(--accent-secondary)" />
                <span>Live Script Preview</span>
              </div>
              <span className="badge badge-success">
                <span className="pulse-circle" style={{ background: 'var(--success)' }} />
                Real-time
              </span>
            </div>

            <div style={{
              background: 'rgba(6, 9, 15, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              minHeight: '90px',
              fontStyle: 'italic',
              color: 'var(--text-primary)',
              fontSize: '0.96rem',
              lineHeight: 1.6,
            }}>
              "{previewScript}"
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={14} color="var(--success)" /> Cloned Voice
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={14} color="var(--success)" /> Lip-Synced GAN
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={14} color="var(--success)" /> HD Video
              </span>
            </div>
          </div>

          {/* Architecture Benefits */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="var(--accent-primary)" />
              <span>How This System Works</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'var(--accent-primary)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}>
                  1
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Cloned Voice Audio (ElevenLabs)</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Personalizes greeting script with your name using high-fidelity cloned vocal timbre.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'var(--accent-secondary)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}>
                  2
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Modal Serverless Lip Sync ($0)</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Open-source Wav2Lip GAN aligns lip motion and phonemes with your master video on T4/L4 GPU.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(236, 72, 153, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'var(--accent-pink)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}>
                  3
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Instant Playback & WhatsApp Share</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Stream the synchronized MP4 greeting, download in one tap, or forward to WhatsApp.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
