import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

const AUTH_URL = process.env.REACT_APP_AUTH_URL || `http://${window.location.hostname}:5000`;
const CODING_URL = process.env.REACT_APP_CODING_URL || `http://${window.location.hostname}:9000`;
const EDITOR_URL = process.env.REACT_APP_EDITOR_URL || `http://${window.location.hostname}:5173`;

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [sharedProjects, setSharedProjects] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem('token');
  const userId = getUserIdFromToken(token);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('upgrade') === 'true' && user && !user.isPremium) {
      setShowUpgradeModal(true);
    }
  }, [location.search, user]);

  useEffect(() => {
    fetchProfile();
    fetchProjects();
    fetchInvites();
    
    // Dynamically load Razorpay SDK
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${AUTH_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

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
        await fetch(`${CODING_URL}/folder`, {
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

  const handleUpgrade = async () => {
    try {
      const orderRes = await fetch(`${AUTH_URL}/payments/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!orderRes.ok) {
        alert('Failed to initialize payment. Try again.');
        return;
      }
      const orderData = await orderRes.json();
      
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'DevBox IDE',
        description: 'Premium Subscription (30 Days)',
        order_id: orderData.orderId,
        handler: async function (response) {
          const verifyRes = await fetch(`${AUTH_URL}/payments/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok) {
            alert('Congratulations! Your premium access is activated.');
            setShowUpgradeModal(false);
            fetchProfile();
          } else {
            alert(verifyData.msg || 'Payment verification failed.');
          }
        },
        prefill: {
          email: user?.email || '',
        },
        theme: {
          color: '#6366f1'
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Upgrade error:', err);
      alert('Error initiating upgrade process.');
    }
  };

  const handleSendInvite = async (e, projectId) => {
    e.stopPropagation();
    if (!user?.isPremium) {
      setShowUpgradeModal(true);
      return;
    }
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
    // Pass token in URL since IDE (port 5173) is a different origin than Dashboard (port 3000)
    window.location.href = `${EDITOR_URL}/?project=${encodeURIComponent(projectName)}&ownerId=${ownerId}&collaboratorId=${userId}&token=${token}`;
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
              <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.95rem' }}>
                All your projects are saved to your account.
              </p>
              {user && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: user.isPremium ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' : 'rgba(255,255,255,0.08)',
                  color: user.isPremium ? '#1e1b4b' : '#a1a1aa',
                  border: user.isPremium ? 'none' : '1px solid rgba(255,255,255,0.15)',
                  boxShadow: user.isPremium ? '0 0 12px rgba(217, 119, 6, 0.4)' : 'none'
                }}>
                  {user.isPremium ? '👑 Premium Member' : '⭐ Free Tier'}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {user && !user.isPremium && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.6)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.3)'}
              >
                🚀 Upgrade to Premium
              </button>
            )}
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

      {/* Premium Upgrade Modal */}
      {showUpgradeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
            border: '1px solid #27272a', borderRadius: '16px', padding: '36px',
            maxWidth: '450px', width: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            textAlign: 'center', position: 'relative'
          }}>
            <button
              onClick={() => setShowUpgradeModal(false)}
              style={{
                position: 'absolute', top: '16px', right: '16px', background: 'transparent',
                border: 'none', color: '#71717a', fontSize: '1.2rem', cursor: 'pointer'
              }}
            >
              ✕
            </button>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👑</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ffffff', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
              Upgrade to Premium
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: '0.95rem', margin: '0 0 24px 0' }}>
              Unlock full developer powers with DevBox Premium.
            </p>
            
            <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: '16px 20px', borderRadius: '12px', border: '1px solid #27272a', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontSize: '0.9rem', color: '#e4e4e7' }}>
                ✅ <strong style={{ color: '#fbbf24' }}>AI Suggestion Autocomplete</strong> (Powered by Gemini 2.5)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontSize: '0.9rem', color: '#e4e4e7' }}>
                ✅ <strong style={{ color: '#60a5fa' }}>Real-time Code Collaboration</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#e4e4e7' }}>
                ✅ <strong style={{ color: '#a78bfa' }}>Unlimited Projects & Files</strong>
              </div>
            </div>

            <div style={{ margin: '24px 0', fontSize: '1.8rem', fontWeight: 800, color: '#ffffff' }}>
              ₹199 <span style={{ fontSize: '1rem', fontWeight: 400, color: '#71717a' }}>/ month</span>
            </div>

            <button
              onClick={handleUpgrade}
              style={{
                width: '100%', padding: '12px',
                background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                color: '#1e1b4b', border: 'none', borderRadius: '8px',
                fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(217, 119, 6, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(217, 119, 6, 0.5)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 15px rgba(217, 119, 6, 0.3)'}
            >
              Subscribe Now
            </button>
            <p style={{ fontSize: '0.75rem', color: '#52525b', marginTop: '16px', marginBottom: 0 }}>
              Secure payments powered by Razorpay. Cancel anytime.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
