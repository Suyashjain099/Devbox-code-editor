import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

// Helper: decode JWT payload without a library (base64 decode)
const getUserIdFromToken = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id;
  } catch {
    return null;
  }
};

const AUTH_URL = 'http://localhost:5000';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [sharedProjects, setSharedProjects] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const userId = getUserIdFromToken(token);

  useEffect(() => {
    fetchProjects();
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      const res = await fetch(`${AUTH_URL}/invites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites || []);
      }
    } catch (err) {
      console.error('Error fetching invites:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${AUTH_URL}/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data.projects || []);
      setSharedProjects(data.sharedProjects || []);
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
      const res = await fetch(`${AUTH_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: name.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.msg || 'Failed to create project');
        return;
      }
      // Also create folder on coding server
      try {
        await fetch('http://localhost:9000/folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: name.trim(), userId })
        });
      } catch (fsErr) {
        console.warn('Folder creation on coding-server:', fsErr.message);
      }
      fetchProjects();
    } catch (err) {
      console.error(err);
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteProject = async (e, projectName) => {
    e.stopPropagation();
    if (!window.confirm(`Delete project "${projectName}"? This cannot be undone.`)) return;
    try {
      await fetch(`${AUTH_URL}/projects/${encodeURIComponent(projectName)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchProjects();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendInvite = async (e, projectId) => {
    e.stopPropagation();
    const email = prompt('Enter the email of the person you want to invite:');
    if (!email || email.trim() === '') return;
    
    try {
      const res = await fetch(`${AUTH_URL}/invites/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ projectId, email: email.trim() })
      });
      const data = await res.json();
      alert(data.msg);
    } catch (err) {
      console.error(err);
      alert('Error sending invite');
    }
  };

  const handleInviteAction = async (inviteId, action) => {
    try {
      const res = await fetch(`${AUTH_URL}/invites/${action}/${inviteId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      alert(data.msg);
      fetchInvites();
      if (action === 'accept') fetchProjects();
    } catch (err) {
      console.error(err);
    }
  };

  const openProject = (projectName, ownerId) => {
    // Pass ownerId to locate the project, and collaboratorId (current user) to determine branch
    window.location.href = `http://localhost:5173/?project=${encodeURIComponent(projectName)}&ownerId=${ownerId}&collaboratorId=${userId}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#ededed',
      fontFamily: 'Inter, sans-serif',
      paddingTop: '80px'
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 0' }}>

        {/* Page Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
          paddingBottom: '24px',
          borderBottom: '1px solid #27272a'
        }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.5px', margin: 0, marginBottom: '6px' }}>
              Your Workspaces
            </h1>
            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.95rem' }}>
              All your projects are saved to your account. Pick up where you left off.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCreateProject}
              style={{
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

        {/* States */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px', color: '#a1a1aa' }}>
            Loading your workspaces...
          </div>
        )}

        {error && (
          <div style={{
            background: '#1a0000', border: '1px solid #7f1d1d',
            borderRadius: '8px', padding: '16px 20px', color: '#f87171', marginBottom: '24px'
          }}>
            ⚠️ {error}. Make sure all servers are running.
          </div>
        )}

        {/* Invites / Inbox section */}
        {invites.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#fbbf24' }}>📥 Project Invitations</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {invites.map(invite => (
                <div key={invite._id} style={{
                  background: '#1a1a1a', border: '1px solid #d97706', borderRadius: '8px',
                  padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <strong>{invite.senderId?.email}</strong> invited you to collaborate on <strong>{invite.projectId?.name}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleInviteAction(invite._id, 'accept')} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Accept</button>
                    <button onClick={() => handleInviteAction(invite._id, 'reject')} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {!loading && !error && (
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>My Projects</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '40px'
            }}>
              {projects.length === 0 ? (
                <div style={{
                  gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px',
                  background: '#111111', border: '1px dashed #27272a', borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📁</div>
                  <h3 style={{ marginBottom: '8px', fontSize: '1.3rem' }}>No projects yet</h3>
                  <p style={{ color: '#a1a1aa' }}>Click "New Project" to create your first workspace.</p>
                </div>
              ) : (
                projects.map(project => (
                  <div
                    key={project._id}
                    onClick={() => openProject(project.name, project.userId)}
                    style={{
                      background: '#111111', border: '1px solid #27272a',
                      borderRadius: '12px', padding: '24px', cursor: 'pointer',
                      transition: 'all 0.2s ease', position: 'relative'
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
                    {/* Invite Button */}
                    <button
                      onClick={(e) => handleSendInvite(e, project._id)}
                      title="Invite Collaborator"
                      style={{
                        position: 'absolute', top: '12px', right: '40px',
                        background: 'transparent', border: '1px solid #3f3f46', color: '#a1a1aa',
                        cursor: 'pointer', fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.borderColor = '#3f3f46'; }}
                    >
                      Invite
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteProject(e, project.name)}
                      title="Delete project"
                      style={{
                        position: 'absolute', top: '12px', right: '12px',
                        background: 'transparent', border: 'none', color: '#52525b',
                        cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1,
                        padding: '4px 6px', borderRadius: '4px'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#52525b'}
                    >
                      ✕
                    </button>

                    <div style={{
                      width: '48px', height: '48px', background: 'rgba(255,255,255,0.07)',
                      borderRadius: '10px', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '1.4rem', marginBottom: '16px'
                    }}>
                      📁
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px', color: '#ededed' }}>
                      {project.name}
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#71717a', margin: 0 }}>
                      Created {formatDate(project.createdAt)}
                    </p>
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #27272a' }}>
                      <span style={{
                        fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px',
                        color: '#71717a', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px'
                      }}>Workspace Owner</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Shared Projects */}
            {sharedProjects.length > 0 && (
              <>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Shared with me</h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '20px'
                }}>
                  {sharedProjects.map(project => (
                    <div
                      key={project._id}
                      onClick={() => openProject(project.name, project.userId._id)}
                      style={{
                        background: '#111111', border: '1px solid #27272a',
                        borderRadius: '12px', padding: '24px', cursor: 'pointer',
                        transition: 'all 0.2s ease', position: 'relative'
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
                        width: '48px', height: '48px', background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '10px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '1.4rem', marginBottom: '16px'
                      }}>
                        🤝
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px', color: '#ededed' }}>
                        {project.name}
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: '#71717a', margin: 0 }}>
                        Shared by {project.userId?.email || 'Unknown'}
                      </p>
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #27272a' }}>
                        <span style={{
                          fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px',
                          color: '#60a5fa', background: 'rgba(59, 130, 246, 0.1)', padding: '3px 8px', borderRadius: '4px'
                        }}>Collaborator</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
