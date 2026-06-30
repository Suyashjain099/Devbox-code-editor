import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isDashboard = location.pathname === '/dashboard';
  const isLoggedIn = !!localStorage.getItem('token');
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (isLoggedIn) {
      const fetchProfile = async () => {
        try {
          const authUrl = process.env.REACT_APP_AUTH_URL || `http://${window.location.hostname}:5000`;
          const res = await fetch(`${authUrl}/users/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data);
          }
        } catch (err) {
          console.error('Error fetching profile in navbar:', err);
        }
      };
      fetchProfile();
    } else {
      setUser(null);
    }
  }, [isLoggedIn, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className='navbar-container'>
        <nav className="navbar">
          <div className="logo">
            <Link to="/" className="logo-link">
              <div className="logo-icon">
                <img src="/logo.png" alt="DevBox Logo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <h1 className='name'>DevBox</h1>
            </Link>
          </div>
          
          <div className="nav-links">
            <Link to="/features" className="nav-link">Features</Link>
            <Link to="/learn" className="nav-link">Learn</Link>
            <Link to="/community" className="nav-link">Community</Link>
            <Link to={isLoggedIn ? "/dashboard?upgrade=true" : "/login"} className={`nav-link subscription-link ${user?.isPremium ? 'premium-badge' : 'free-badge'}`}>
              {user?.isPremium ? '👑 Premium' : '⭐ Subscription'}
            </Link>
          </div>
          
          <div className='nav-actions'>
            {!isAuthPage && !isDashboard && !isLoggedIn && (
              <>
                <Link to='/login' className="btn-no-bg">Log in</Link>
                <Link to='/signup' className="btn-primary">Start Building</Link>
              </>
            )}
            {!isAuthPage && isLoggedIn && !isDashboard && (
              <>
                <Link to='/dashboard' className="btn-no-bg">Dashboard</Link>
                <button onClick={handleLogout} className="btn-primary" style={{cursor:'pointer', border:'none'}}>Logout</button>
              </>
            )}
            {isDashboard && (
              <>
                <button onClick={handleLogout} className="btn-no-bg" style={{cursor:'pointer', border:'none', background:'none', color:'inherit', fontFamily:'inherit', fontSize:'inherit'}}>Logout</button>
              </>
            )}
          </div>
        </nav>
    </div>
  )
}

export default Navbar
