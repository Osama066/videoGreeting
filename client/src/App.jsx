import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import GreetingPage from './pages/GreetingPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />

        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/greeting/:jobId" element={<GreetingPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>

        <footer style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          backgroundColor: 'rgba(6, 9, 15, 0.6)',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              © {new Date().getFullYear()} <strong>Sanrachana AI</strong>. High-Fidelity Personalized Video Greetings.
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span>ElevenLabs Cloned TTS</span>
              <span>•</span>
              <span>Modal Serverless GPU ($0 Lip-Sync)</span>
              <span>•</span>
              <span>Cloudinary CDN</span>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
