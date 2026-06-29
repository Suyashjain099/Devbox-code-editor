import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`http://${window.location.hostname}:9000/files`);
      if (!res.ok) throw new Error('Could not reach coding server');
      const data = await res.json();
      if (data && data.tree) {
        // Get top-level folders only (entries that are objects, not strings)
        const folders = Object.entries(data.tree)
          .filter(([, val]) => val !== null && typeof val === 'object')
          .map(([key]) => key);
        setProjects(folders);
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    const name = prompt('Enter new project name:');
    if (!name || name.trim() === '') return;
    try {
      const res = await fetch(`http://${window.location.hostname}:9000/folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: name.trim() })
      });
      if (!res.ok) throw new Error('Failed to create project');
      fetchProjects();
    } catch (err) {
      console.error(err);
      alert('Error creating project: ' + err.message);
    }
  };

  const openProject = (projectName) => {
    window.location.href = `http://${window.location.hostname}:5173/?project=${encodeURIComponent(projectName)}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#ededed',
      fontFamily: 'Inter, sans-serif',
      paddingTop: '80px'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '40px 24px 0'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
          paddingBottom: '24px',
          borderBottom: '1px solid #27272a'
        }}>
          <div>
            <h1 style={{
              fontSize: '2.2rem',
              fontWeight: 700,
              letterSpacing: '-0.5px',
              margin: 0,
              marginBottom: '8px'
            }}>Your Workspaces</h1>
            <p style={{ color: '#a1a1aa', margin: 0 }}>
              Select a project to open the compiler.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleCreateProject}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              + New Project
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                color: '#a1a1aa',
                border: '1px solid #27272a',
                borderRadius: '8px',
                fontWeight: 500,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px', color: '#a1a1aa' }}>
            Loading workspaces...
          </div>
        )}

        {error && (
          <div style={{
            background: '#1a0000',
            border: '1px solid #7f1d1d',
            borderRadius: '8px',
            padding: '16px 20px',
            color: '#f87171',
            marginBottom: '24px'
          }}>
            ⚠️ Could not connect to coding server: {error}. Make sure Docker is running.
          </div>
        )}

        {!loading && !error && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {projects.length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '80px 20px',
                background: '#111111',
                border: '1px dashed #27272a',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📁</div>
                <h3 style={{ marginBottom: '8px', fontSize: '1.3rem' }}>No projects yet</h3>
                <p style={{ color: '#a1a1aa' }}>Click "New Project" to create your first workspace.</p>
              </div>
            ) : (
              projects.map(project => (
                <div
                  key={project}
                  onClick={() => openProject(project)}
                  style={{
                    background: '#111111',
                    border: '1px solid #27272a',
                    borderRadius: '12px',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#52525b';
                    e.currentTarget.style.background = '#1a1a1a';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#27272a';
                    e.currentTarget.style.background = '#111111';
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'rgba(255,255,255,0.07)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    marginBottom: '16px'
                  }}>
                    📁
                  </div>
                  <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: '#ededed'
                  }}>{project}</h3>
                  <div style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #27272a'
                  }}>
                    <span style={{
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      color: '#71717a',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '3px 8px',
                      borderRadius: '4px'
                    }}>Workspace</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
