import React, { useState, useEffect, useRef } from 'react';
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
  Pause,
  RefreshCw,
  ExternalLink,
  Zap,
  Clock,
  Check,
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
  const [uploadMode, setUploadMode] = useState('name_slot');
  const [uploadSlotStart, setUploadSlotStart] = useState(1.0);
  const [uploadSlotEnd, setUploadSlotEnd] = useState(2.6);
  const [uploadPrefix, setUploadPrefix] = useState('Hello');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Editing state for existing videos: map of videoId -> { mode, nameSlotStart, nameSlotEnd, prefixPhrase, suffixPhrase, saving, saveMsg }
  const [videoEdits, setVideoEdits] = useState({});

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
    formData.append('mode', uploadMode);
    formData.append('nameSlotStart', uploadSlotStart);
    formData.append('nameSlotEnd', uploadSlotEnd);
    formData.append('prefixPhrase', uploadPrefix);

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

  // Update video timing and mode settings
  const handleUpdateVideoSettings = async (id, settings) => {
    try {
      const res = await fetch(`/api/admin/master-videos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update video settings.');
      }
      fetchData();
      return true;
    } catch (err) {
      alert('Error updating settings: ' + err.message);
      return false;
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
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '40px 24px', boxSizing: 'border-box' }}>
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '28px',
          alignItems: 'start',
        }}>
          {/* Upload Card */}
          <div className="glass-panel" style={{ padding: '24px', maxWidth: '440px', width: '100%', boxSizing: 'border-box' }}>
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

              <div className="form-group">
                <label className="form-label">Generation Mode</label>
                <select
                  className="form-input"
                  value={uploadMode}
                  onChange={(e) => setUploadMode(e.target.value)}
                >
                  <option value="name_slot">⚡ Name-Slot Mode (~90% Cheaper & 10x Faster)</option>
                  <option value="full_video">Full Script Mode (Rerenders entire video)</option>
                </select>
              </div>

              {uploadMode === 'name_slot' && (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} />
                    <span>Name Slot Timing & Prefix</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Start Time (s)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        className="form-input"
                        value={uploadSlotStart}
                        onChange={(e) => setUploadSlotStart(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>End Time (s)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        className="form-input"
                        value={uploadSlotEnd}
                        onChange={(e) => setUploadSlotEnd(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Spoken Prefix Phrase</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Hello"
                      value={uploadPrefix}
                      onChange={(e) => setUploadPrefix(e.target.value)}
                    />
                  </div>
                </div>
              )}

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
              <span>Configured Master Videos</span>
            </h2>

            {masterVideos.length === 0 ? (
              <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Film size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p>No master videos uploaded yet.</p>
                <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Upload your first video on the left to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {masterVideos.map((video) => (
                  <MasterVideoCard
                    key={video._id || video.id}
                    video={video}
                    onActivate={() => handleActivateVideo(video._id || video.id)}
                    onDelete={() => handleDeleteVideo(video._id || video.id)}
                    onSaveSettings={(settings) => handleUpdateVideoSettings(video._id || video.id, settings)}
                  />
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

/**
 * Interactive Master Video Card with live segment preview and timing editor
 */
function MasterVideoCard({ video, onActivate, onDelete, onSaveSettings }) {
  const [mode, setMode] = useState(video.mode || 'name_slot');
  const [start, setStart] = useState(video.nameSlotStart !== undefined ? video.nameSlotStart : 1.0);
  const [end, setEnd] = useState(video.nameSlotEnd !== undefined ? video.nameSlotEnd : 2.6);
  const [prefix, setPrefix] = useState(video.prefixPhrase !== undefined ? video.prefixPhrase : 'Hello');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPlayingSlot, setIsPlayingSlot] = useState(false);

  const videoRef = useRef(null);

  useEffect(() => {
    setMode(video.mode || 'name_slot');
    setStart(video.nameSlotStart !== undefined ? video.nameSlotStart : 1.0);
    setEnd(video.nameSlotEnd !== undefined ? video.nameSlotEnd : 2.6);
    setPrefix(video.prefixPhrase !== undefined ? video.prefixPhrase : 'Hello');
  }, [video]);

  const handlePlaySlot = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    v.currentTime = start;
    v.play();
    setIsPlayingSlot(true);

    const onTimeUpdate = () => {
      if (v.currentTime >= end) {
        v.pause();
        v.removeEventListener('timeupdate', onTimeUpdate);
        setIsPlayingSlot(false);
      }
    };
    v.addEventListener('timeupdate', onTimeUpdate);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSaveSettings({
      mode,
      nameSlotStart: start,
      nameSlotEnd: end,
      prefixPhrase: prefix,
    });
    setIsSaving(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const isSlotMode = mode === 'name_slot';

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>
              {video.title}
            </span>
            {video.isActive && (
              <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>Active Master</span>
            )}
            {isSlotMode ? (
              <span className="badge badge-info" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <Zap size={11} /> Name-Slot Mode
              </span>
            ) : (
              <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>Full Video Mode</span>
            )}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Duration: {video.duration ? `${Math.round(video.duration)}s` : '—'} • Created {new Date(video.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!video.isActive && (
            <button
              onClick={onActivate}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              Set as Active
            </button>
          )}
          <button
            onClick={onDelete}
            className="btn-secondary"
            style={{ padding: '6px 10px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            title="Delete video"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Main Grid: Video Player + Settings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'start' }}>
        {/* Video Box */}
        <div style={{ minWidth: 0 }}>
          <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', border: '1px solid var(--border-subtle)' }}>
            <video
              ref={videoRef}
              src={video.cloudinaryUrl}
              controls
              style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '200px', objectFit: 'cover' }}
            />
          </div>

          {isSlotMode && (
            <button
              type="button"
              onClick={handlePlaySlot}
              className="btn-secondary"
              disabled={isPlayingSlot}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '8px 12px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                color: 'var(--accent-primary)',
                borderColor: 'rgba(99, 102, 241, 0.4)',
              }}
            >
              <Play size={13} />
              <span>{isPlayingSlot ? 'Playing Slot...' : `Preview Slot (${start}s - ${end}s)`}</span>
            </button>
          )}
        </div>

        {/* Configuration Controls */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', minWidth: 0 }}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Generation Mode</label>
            <select
              className="form-input"
              style={{ padding: '8px 10px', fontSize: '0.84rem', width: '100%', textOverflow: 'ellipsis' }}
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="name_slot">⚡ Name-Slot Mode (Fast ~3s & ~90% Cost Saving)</option>
              <option value="full_video">Full Script Mode (Rerender whole video ~25s)</option>
            </select>
          </div>

          {isSlotMode && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div style={{ minWidth: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Start Time (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="form-input"
                    style={{ padding: '8px 10px', fontSize: '0.85rem', width: '100%' }}
                    value={start}
                    onChange={(e) => setStart(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>End Time (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    className="form-input"
                    style={{ padding: '8px 10px', fontSize: '0.85rem', width: '100%' }}
                    value={end}
                    onChange={(e) => setEnd(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '0.76rem' }}>Prefix Phrase (e.g. Hello)</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '8px 10px', fontSize: '0.85rem', width: '100%' }}
                  placeholder="e.g. Hello"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Save Changes Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            {saveSuccess && (
              <span style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} /> Saved!
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.84rem', gap: '6px' }}
            >
              {isSaving ? (
                <>
                  <RefreshCw size={13} style={{ animation: 'spin 1.5s linear infinite' }} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save Video Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
