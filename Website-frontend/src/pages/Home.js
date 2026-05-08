import React from 'react';
import './Home.css';
import { Link } from 'react-router-dom';
import { FaTwitter, FaGithub, FaLinkedin, FaTerminal, FaCode, FaUsers, FaBolt } from 'react-icons/fa';

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
                    <Link to="/login" className="btn-secondary hero-btn">View Documentation</Link>
                </div>
            </div>

            <div className="editor-showcase">
                <div className="editor-glow"></div>
                <div className="editor-window">
                    <div className="editor-header">
                        <div className="traffic-lights">
                            <span className="dot red"></span>
                            <span className="dot yellow"></span>
                            <span className="dot green"></span>
                        </div>
                        <div className="file-name">server.js</div>
                    </div>
                    <div className="editor-body">
                        <pre>
<code><span className="token keyword">import</span> express <span className="token keyword">from</span> <span className="token string">'express'</span>;
<span className="token keyword">import</span> mongoose <span className="token keyword">from</span> <span className="token string">'mongoose'</span>;

<span className="token keyword">const</span> app <span className="token operator">=</span> <span className="token function">express</span>();

app.<span className="token function">get</span>(<span className="token string">'/'</span>, (req, res) <span className="token operator">=&gt;</span> {"{"}
    res.<span className="token function">json</span>({"{"} <span className="token property">status</span>: <span className="token string">'DevBox IDE is running! 🚀'</span> {"}"});
{"}"});

app.<span className="token function">listen</span>(<span className="token number">3000</span>, () <span className="token operator">=&gt;</span> console.<span className="token function">log</span>(<span className="token string">'Ready.'</span>));</code>
                        </pre>
                    </div>
                </div>
            </div>
        </div>

        <section className="features-grid-section">
            <div className="features-header">
                <h2>Powering the next generation of developers.</h2>
                <p>Everything you need to write world-class code directly in your browser.</p>
            </div>
            
            <div className="bento-grid">
                <div className="bento-card">
                    <div className="bento-icon"><FaTerminal /></div>
                    <h3>Instant Execution</h3>
                    <p>No local environment needed. Run Node, Python, C++, and Go instantly with our powerful backend compilers.</p>
                </div>
                <div className="bento-card highlighted">
                    <div className="bento-icon"><FaUsers /></div>
                    <h3>Real-time Collaboration</h3>
                    <p>Share your workspace and code together as easily as editing a Google Doc. Conflict-free and blazing fast.</p>
                </div>
                <div className="bento-card">
                    <div className="bento-icon"><FaBolt /></div>
                    <h3>Zero Latency</h3>
                    <p>Built on WebSockets for real-time terminal streaming. You'll forget you're even using a browser.</p>
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
                    <a href="#" className="footer-icon-link"><FaTwitter className="icon" /></a>
                    <a href="#" className="footer-icon-link"><FaGithub className="icon" /></a>
                    <a href="#" className="footer-icon-link"><FaLinkedin className="icon" /></a>
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
