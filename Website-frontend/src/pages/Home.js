import React from 'react';
import './Home.css';
import { Link } from 'react-router-dom';
import { FaTwitter, FaGithub, FaLinkedin, FaTerminal, FaUsers, FaBolt } from 'react-icons/fa';

const Home = () => {
  return (
    <div className='home-body'>
        <div className="hero-section">
            <div className="hero-content">
                <div className="badge">✨ Introducing DevBox IDE 2.0</div>
                <h1 className="hero-title">
                    The Modern Engine for <br/> 
                    <span className="gradient-text">Software Creation</span>
                </h1>
                <p className="hero-subtitle">
                    Skip the setup. DevBox is an ultra-fast, professional-grade <br/> browser IDE, compiler, and interpreter. Build, collaborate, and ship natively.
                </p>
                <div className="hero-buttons">
                    <Link to="/signup" className="btn-primary hero-btn">Start Coding for Free</Link>
                    <Link to="/learn" className="btn-secondary hero-btn">View Documentation</Link>
                </div>
            </div>

            <div className="editor-showcase">
                <div className="editor-glow"></div>
                <div className="editor-window image-mockup">
                    <img src="/ide_mockup.png" alt="DevBox IDE Workspace" className="mockup-img" />
                </div>
            </div>
        </div>

        <section className="features-grid-section">
            <div className="features-header">
                <h2>Powering the next generation of developers.</h2>
                <p>Everything you need to write world-class code directly in your browser.</p>
            </div>
            
            <div className="bento-grid">
                <div className="bento-card" style={{ backgroundImage: 'url(/img_execution.png)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(10,10,10,0.6) 100%)', zIndex: 0 }}></div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="bento-icon"><FaTerminal /></div>
                        <h3>Instant Execution</h3>
                        <p>No local environment needed. Run Node, Python, C++, and Go instantly with our powerful backend compilers.</p>
                    </div>
                </div>
                <div className="bento-card highlighted" style={{ backgroundImage: 'url(/collab_abstract.png)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(10,10,10,0.4) 100%)', zIndex: 0 }}></div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="bento-icon"><FaUsers /></div>
                        <h3>Real-time Collaboration</h3>
                        <p>Share your workspace and code together as easily as editing a Google Doc. Conflict-free and blazing fast.</p>
                    </div>
                </div>
                <div className="bento-card" style={{ backgroundImage: 'url(/img_latency.png)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(10,10,10,0.6) 100%)', zIndex: 0 }}></div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="bento-icon"><FaBolt /></div>
                        <h3>Zero Latency</h3>
                        <p>Built on WebSockets for real-time terminal streaming. You'll forget you're even using a browser.</p>
                    </div>
                </div>
            </div>
        </section>

    <footer className="footer">
    <div className="container">
        <div className="footer-grid">
            <div>
                <h3 className="footer-heading">Product</h3>
                <ul className="footer-list">
                    <li><Link to="/" className="footer-link">IDE</Link></li>
                    <li><Link to="/" className="footer-link">Multiplayer</Link></li>
                </ul>
            </div>
            <div>
                <h3 className="footer-heading">Company</h3>
                <ul className="footer-list">
                    <li><Link to="/" className="footer-link">About</Link></li>
                    <li><Link to="/" className="footer-link">Careers</Link></li>
                </ul>
            </div>
            <div>
                <h3 className="footer-heading-icons">Connect</h3>
                <div className="footer-icons">
                    <a href="https://twitter.com" className="footer-icon-link"><FaTwitter className="icon" /></a>
                    <a href="https://github.com" className="footer-icon-link"><FaGithub className="icon" /></a>
                    <a href="https://linkedin.com" className="footer-icon-link"><FaLinkedin className="icon" /></a>
                </div>
            </div>
        </div>
        <div className="footer-bottom">
            © DevBox. All rights reserved.
        </div>
    </div>
    </footer>
    </div>
  );
};

export default Home;
