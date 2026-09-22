import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Download,
  Share2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Play,
  Volume2,
  Cpu,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';

export default function GreetingPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const confettiFired = useRef(false);

  // Poll for job status
  useEffect(() => {
    let intervalId;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to retrieve greeting status.');
        }

        setJob(data.job);
        setLoading(false);

        // Stop polling if completed or failed
        if (data.job.status === 'completed') {
          clearInterval(intervalId);
          if (!confettiFired.current) {
            confettiFired.current = true;
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#6366f1', '#8b5cf6', '#ec4899', '#10b981'],
            });
          }
        } else if (data.job.status === 'failed') {
          clearInterval(intervalId);
        }
      } catch (err) {
        setError(err.message || 'Error connecting to server.');
        setLoading(false);
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 2500);

    return () => clearInterval(intervalId);
  }, [jobId]);

  const handleShareWhatsApp = () => {
    if (!job) return;
    const greetingUrl = window.location.href;
    const message = encodeURIComponent(
      `🎉 Check out my personalized AI video greeting from Sanrachana AI!\nWatch here: ${greetingUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleDownloadVideo = () => {
    if (!job || !job.finalVideoUrl) return;
    const a = document.createElement('a');
    a.href = job.finalVideoUrl;
    a.download = `greeting_${job.userName.toLowerCase().replace(/\s+/g, '_')}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '700px', margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
        <div className="pulse-circle" style={{ width: '40px', height: '40px', background: 'var(--accent-primary)', margin: '0 auto 24px' }} />
        <h2>Loading Greeting Session...</h2>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 24px' }}>
        <div className="glass-panel" style={{ padding: '36px', textAlign: 'center' }}>
          <AlertCircle size={44} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ marginBottom: '8px' }}>Greeting Session Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            {error || 'The requested greeting ID does not exist or may have expired.'}
          </p>
          <Link to="/" className="btn-primary">
            <ArrowLeft size={16} />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    );
  }

  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Back link */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} />
          <span>Create another greeting</span>
        </Link>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span className={`badge ${isCompleted ? 'badge-success' : isFailed ? 'badge-danger' : 'badge-warning'}`}>
            <span className="pulse-circle" style={{ background: isCompleted ? 'var(--success)' : isFailed ? 'var(--danger)' : 'var(--warning)' }} />
            {job.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '-0.02em', marginBottom: '8px' }}>
          Personalized Greeting for <span className="gradient-text">{job.userName}</span>
        </h1>
        {job.greetingText && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', maxWidth: '650px', margin: '0 auto' }}>
            "{job.greetingText}"
          </p>
        )}
      </div>

      {/* In-Progress State: Live Steps & Progress Bar */}
      {!isCompleted && !isFailed && (
        <div className="glass-panel" style={{ padding: '36px', marginBottom: '32px', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--accent-gradient-subtle)',
            border: '1px solid var(--border-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <RefreshCw size={28} color="var(--accent-primary)" style={{ animation: 'spin 3s linear infinite' }} />
          </div>

          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{job.message}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
            Please keep this page open. GPU inference and voice synthesis take ~15–30 seconds.
          </p>

          {/* Progress bar */}
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${job.progress || 25}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>Synthesizing Voice</span>
            <span>Wav2Lip Lip-Sync</span>
            <span>HD Encoding</span>
          </div>

          {/* Step cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '32px',
            textAlign: 'left',
          }}>
            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: job.step >= 1 ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              border: job.step >= 1 ? '1px solid var(--border-glow)' : '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>
                <Volume2 size={16} color="var(--accent-primary)" />
                <span>1. Cloned Speech</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {job.step > 1 ? 'Generated with ElevenLabs' : 'Generating audio...'}
              </div>
            </div>

            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: job.step >= 2 ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              border: job.step >= 2 ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>
                <Cpu size={16} color="var(--accent-secondary)" />
                <span>2. Wav2Lip GAN</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {job.step > 2 ? 'Lip-sync completed' : 'Processing on GPU...'}
              </div>
            </div>

            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: job.step >= 3 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              border: job.step >= 3 ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>
                <CheckCircle2 size={16} color="var(--success)" />
                <span>3. Ready for Delivery</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Finalizing video output...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Failed State */}
      {isFailed && (
        <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', marginBottom: '32px' }}>
          <AlertCircle size={44} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ marginBottom: '8px' }}>Generation Failed</h2>
          <p style={{ color: 'var(--danger)', fontSize: '0.92rem', marginBottom: '24px' }}>
            {job.errorMessage || 'An error occurred while generating the greeting.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/" className="btn-primary">
              <RefreshCw size={16} />
              <span>Try Again</span>
            </Link>
          </div>
        </div>
      )}

      {/* Completed State: Embedded Video Player + Download + WhatsApp Share */}
      {isCompleted && (
        <div>
          {/* Ambient Glow Video Frame */}
          <div style={{
            position: 'relative',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            marginBottom: '28px',
            background: '#000000',
          }}>
            <video
              src={job.finalVideoUrl}
              controls
              autoPlay
              playsInline
              style={{
                width: '100%',
                maxHeight: '540px',
                display: 'block',
                objectFit: 'contain',
              }}
            >
              Your browser does not support HTML5 video playback.
            </video>
          </div>

          {/* Action Bar */}
          <div className="glass-panel" style={{ padding: '24px 32px' }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Your AI Greeting is Ready!</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Download high-definition MP4 or share instantly to WhatsApp.
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  className="btn-primary"
                  style={{ padding: '12px 22px' }}
                >
                  <Download size={18} />
                  <span>Download MP4</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="btn-secondary"
                  style={{
                    padding: '12px 22px',
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                    color: '#10b981',
                  }}
                >
                  <Share2 size={18} />
                  <span>Share on WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
