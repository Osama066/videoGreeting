import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  Film,
  CheckCircle,
  Trash2,
  Download,
  Settings,
  Users,
  AlertCircle,
  FileText,
  Save,
  Play,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('master-videos'); // 'master-videos' | 'template' | 'leads'
  const [systemConfig, setSystemConfig] = useState(null);
  const [masterVideos, setMasterVideos] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [greetingTemplate, setGreetingTemplate] = useState('');
  const [templateSaveStatus, setTemplateSaveStatus] = useState('');

  // Upload master video state
  const [uploadFile, setUploadFile] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Leads search
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch initial admin data
  const fetchData = async () => {
    try {
      // 1. Config & System status
      const configRes = await fetch('/api/admin/config');
      const configData = await configRes.json();
      if (configData.success) {
        setSystemConfig(configData.config);
        setGreetingTemplate(configData.config.greetingTemplate);
      }

      // 2. Master videos
      const videosRes = await fetch('/api/admin/master-videos');
      const videosData = await videosRes.json();
      if (videosData.success) {
        setMasterVideos(videosData.masterVideos);
      }

      // 3. Jobs / Leads
      const jobsRes = await fetch('/api/admin/jobs');
      const jobsData = await jobsRes.json();
      if (jobsData.success) {
        setJobs(jobsData.jobs);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Upload handler
  const handleUploadMasterVideo = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a video file.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('video', uploadFile);
    if (videoTitle.trim()) {
      formData.append('title', videoTitle.trim());
    }

    try {
      const res = await fetch('/api/admin/master-video', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload master video.');
      }
      setUploadFile(null);
      setVideoTitle('');
      fetchData();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Activate master video
  const handleActivateVideo = async (id) => {
    try {
      await fetch(`/api/admin/master-videos/${id}/activate`, { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete master video
  const handleDeleteVideo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this master video?')) return;
    try {
      await fetch(`/api/admin/master-videos/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Save template
  const handleSaveTemplate = async () => {
    if (!greetingTemplate.includes('{name}')) {
      alert('Template must contain the {name} placeholder.');
      return;
    }

    try {
      setTemplateSaveStatus('Saving...');
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ greetingTemplate }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save template.');
      }
      setTemplateSaveStatus('Saved successfully!');
      setTimeout(() => setTemplateSaveStatus(''), 3000);
    } catch (err) {
      setTemplateSaveStatus('Error saving: ' + err.message);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    const q = searchQuery.toLowerCase();
    return (
      (j.userName && j.userName.toLowerCase().includes(q)) ||
      (j.userMobile && j.userMobile.includes(q)) ||
      (j.userEmail && j.userEmail.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={28} color="var(--accent-primary)" />
            <span>Admin Studio</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Manage master greeting videos, script templates, and lead records.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '32px',
      }}>
        <button
          onClick={() => setActiveTab('master-videos')}
          style={{
            padding: '12px 20px',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: activeTab === 'master-videos' ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'master-videos' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Film size={18} />
          <span>Master Videos ({masterVideos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('template')}
          style={{
            padding: '12px 20px',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: activeTab === 'template' ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'template' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FileText size={18} />
          <span>Script Template</span>
        </button>

        <button
          onClick={() => setActiveTab('leads')}
          style={{
            padding: '12px 20px',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: activeTab === 'leads' ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'leads' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Users size={18} />
          <span>Leads & Videos ({jobs.length})</span>
        </button>
      </div>

      {/* TAB 1: Master Videos */}
      {activeTab === 'master-videos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '32px' }}>
          {/* Upload Card */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UploadCloud size={20} color="var(--accent-primary)" />
              <span>Upload New Master Video</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Upload a 10–25 second talking head video with a clear face view. The mouth will be dynamically animated to match each greeting.
            </p>

            {uploadError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', marginBottom: '16px' }}>
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadMasterVideo}>
              <div className="form-group">
                <label className="form-label">Video Title / Label</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CEO Welcome Greeting (Vertical)"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Select MP4 or MOV File *</label>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  className="form-input"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isUploading}
                style={{ width: '100%', marginTop: '8px' }}
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1.5s linear infinite' }} />
                    <span>Uploading to Cloudinary...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={18} />
                    <span>Upload Master Video</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Master Videos List */}
          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Film size={20} color="var(--accent-secondary)" />
              <span>Available Master Videos</span>
            </h2>

            {masterVideos.length === 0 ? (
              <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Film size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p>No master videos uploaded yet.</p>
                <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Upload your first video on the left to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {masterVideos.map((video) => (
                  <div key={video._id || video.id} className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '120px', height: '70px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                      <video src={video.cloudinaryUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {video.title}
                        </span>
                        {video.isActive && (
                          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Active</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {video.duration ? `${Math.round(video.duration)}s` : 'Video'} • {new Date(video.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      {!video.isActive && (
                        <button
                          onClick={() => handleActivateVideo(video._id || video.id)}
                          className="btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteVideo(video._id || video.id)}
                        className="btn-secondary"
                        style={{ padding: '8px 10px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        title="Delete video"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Script Template */}
      {activeTab === 'template' && (
        <div style={{ maxWidth: '750px' }}>
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="var(--accent-primary)" />
              <span>Personalized Script Template</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '24px' }}>
              Define the greeting message synthesized by ElevenLabs. Use the <code>{'{name}'}</code> token where the user's name should be spoken.
            </p>

            <div className="form-group">
              <label className="form-label">Greeting Script</label>
              <textarea
                rows={5}
                className="form-input"
                style={{ resize: 'vertical', lineHeight: 1.6 }}
                value={greetingTemplate}
                onChange={(e) => setGreetingTemplate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setGreetingTemplate((prev) => prev + ' {name}')}
                style={{ fontSize: '0.85rem' }}
              >
                + Insert {'{name}'} Token
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {templateSaveStatus && (
                  <span style={{ fontSize: '0.85rem', color: templateSaveStatus.includes('Error') ? 'var(--danger)' : 'var(--success)' }}>
                    {templateSaveStatus}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="btn-primary"
                  style={{ padding: '12px 24px' }}
                >
                  <Save size={16} />
                  <span>Save Template</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Leads & Videos Table */}
      {activeTab === 'leads' && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Captured Leads & Video Greetings</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                All user submissions with corresponding contact details and video links.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '10px 14px', fontSize: '0.88rem', width: '240px' }}
              />

              <a
                href="/api/admin/leads/export"
                download
                className="btn-secondary"
                style={{ padding: '10px 16px', fontSize: '0.88rem', gap: '6px' }}
              >
                <Download size={16} />
                <span>Export CSV</span>
              </a>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Name</th>
                  <th style={{ padding: '12px 16px' }}>Mobile Number</th>
                  <th style={{ padding: '12px 16px' }}>Email</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Created</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No lead records found.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr key={job._id || job.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{job.userName}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{job.userMobile}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{job.userEmail || '—'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${job.status === 'completed' ? 'badge-success' : job.status === 'failed' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.72rem' }}>
                          {job.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {job.createdAt ? new Date(job.createdAt).toLocaleString() : ''}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <a
                          href={`/greeting/${job._id || job.id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: 'var(--accent-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                          }}
                        >
                          <span>View</span>
                          <ExternalLink size={13} />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
