import React from 'react';
import './PageStyles.css';

const Features = () => {
  return (
    <div className="page-container">
      <div className="content-wrapper">
        <h1 className="page-title">Platform Features</h1>
        <p className="page-subtitle">Everything you need to write, execute, and collaborate on code.</p>

        <div className="feature-grid">
          <div className="feature-card image-card" style={{ backgroundImage: 'url(/img_ai.png)' }}>
            <div className="image-card-overlay"></div>
            <div className="image-card-content">
              <div className="feature-icon">🤖</div>
              <h3>AI Code Autocomplete</h3>
              <p>Powered by Gemini 3.1 Flash-Lite, our context-aware ghost-text autocomplete predicts your next lines of code. Simply pause to see the suggestion, and press <code>Tab</code> to accept.</p>
            </div>
          </div>

          <div className="feature-card image-card" style={{ backgroundImage: 'url(/img_docker.png)' }}>
            <div className="image-card-overlay"></div>
            <div className="image-card-content">
              <div className="feature-icon">⚡</div>
              <h3>Dockerized Execution</h3>
              <p>Your code runs in isolated, secure Docker containers. This ensures a consistent environment free from conflicts, supporting system-level packages and rapid execution times.</p>
            </div>
          </div>

          <div className="feature-card image-card" style={{ backgroundImage: 'url(/collab_abstract.png)' }}>
            <div className="image-card-overlay"></div>
            <div className="image-card-content">
              <div className="feature-icon">🤝</div>
              <h3>Real-Time Collaboration</h3>
              <p>Share your workspace URL with teammates. Code together with real-time file tree syncing, integrated pushing and pulling of global changes, and zero merge conflicts.</p>
            </div>
          </div>

          <div className="feature-card image-card" style={{ backgroundImage: 'url(/img_terminal.png)' }}>
            <div className="image-card-overlay"></div>
            <div className="image-card-content">
              <div className="feature-icon">🖥️</div>
              <h3>Integrated Terminal</h3>
              <p>A full-fledged bash terminal integrated right into the IDE. Run scripts, install dependencies, and navigate your project directory just like on your local machine.</p>
            </div>
          </div>

          <div className="feature-card image-card" style={{ backgroundImage: 'url(/img_filesystem.png)' }}>
            <div className="image-card-overlay"></div>
            <div className="image-card-content">
              <div className="feature-icon">📁</div>
              <h3>Intelligent File System</h3>
              <p>Create nested directories and files seamlessly. Our Monaco-powered editor automatically adjusts syntax highlighting and linting based on file extensions.</p>
            </div>
          </div>

          <div className="feature-card image-card" style={{ backgroundImage: 'url(/img_ui_ux.png)' }}>
            <div className="image-card-overlay"></div>
            <div className="image-card-content">
              <div className="feature-icon">🎨</div>
              <h3>Modern UI & UX</h3>
              <p>Enjoy a distraction-free coding environment with smooth animations, drag-to-resize panels, and a sleek Dark/Light mode toggle designed to reduce eye strain.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;
