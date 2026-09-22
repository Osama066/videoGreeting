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
          padding: '16px 24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.82rem',
        }}>
          <div>
            © {new Date().getFullYear()} Video Greeting Studio. All rights reserved.
          </div>
        </footer>
      </div>
    </Router>
  );
}
