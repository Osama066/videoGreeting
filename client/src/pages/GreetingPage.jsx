import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Download, Share2, ArrowLeft, RefreshCw } from 'lucide-react';

export default function GreetingPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const confettiFired = useRef(false);

  useEffect(() => {
    let intervalId;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to retrieve greeting.');
        }

        setJob(data.job);
        setLoading(false);

        if (data.job.status === 'completed') {
          clearInterval(intervalId);
          if (!confettiFired.current) {
            confettiFired.current = true;
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 },
              colors: ['#6366f1', '#8b5cf6', '#10b981'],
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
      `Here is my video greeting from Sanrachana: ${greetingUrl}`
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
      <div style={{ maxWidth: '480px', margin: '120px auto', textAlign: 'center', padding: '0 24px' }}>
        <div className="pulse-circle" style={{ width: '28px', height: '28px', background: 'var(--accent-primary)', margin: '0 auto 18px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading greeting...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={{ maxWidth: '480px', margin: '100px auto', padding: '0 24px' }}>
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Greeting Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            {error || 'This greeting link may be invalid or expired.'}
          </p>
          <Link to="/" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '36px 20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>
          Greeting for <span style={{ color: 'var(--accent-primary)' }}>{job.userName}</span>
        </h1>
      </div>

      {/* Generating Progress State */}
      {!isCompleted && !isFailed && (
        <div className="glass-panel" style={{ padding: '36px 28px', textAlign: 'center' }}>
          <div style={{ marginBottom: '16px' }}>
            <RefreshCw size={24} color="var(--accent-primary)" style={{ animation: 'spin 2.5s linear infinite' }} />
          </div>

          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '6px' }}>
            Generating your video greeting
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginBottom: '20px' }}>
            Please wait a few moments while your personalized video is being rendered.
          </p>

          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${job.progress || 35}%` }} />
          </div>
        </div>
      )}

      {/* Failed State */}
      {isFailed && (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '8px', color: 'var(--danger)' }}>
            Unable to Generate Greeting
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
            {job.errorMessage || 'An error occurred during video creation.'}
          </p>
          <Link to="/" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
            Try Again
          </Link>
        </div>
      )}

      {/* Completed State: Clean Video Player */}
      {isCompleted && (
        <div>
          <div style={{
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            background: '#000000',
            marginBottom: '20px',
          }}>
            <video
              src={job.finalVideoUrl}
              controls
              autoPlay
              playsInline
              style={{
                width: '100%',
                maxHeight: '520px',
                display: 'block',
                objectFit: 'contain',
              }}
            >
              Your browser does not support video playback.
            </video>
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'center',
          }}>
            <button
              type="button"
              onClick={handleDownloadVideo}
              className="btn-primary"
              style={{ padding: '12px 24px', fontSize: '0.92rem' }}
            >
              <Download size={16} />
              <span>Download Video</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="btn-secondary"
              style={{ padding: '12px 24px', fontSize: '0.92rem' }}
            >
              <Share2 size={16} />
              <span>Share on WhatsApp</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
