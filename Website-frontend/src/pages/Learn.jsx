import React from 'react';
import './PageStyles.css';

const Learn = () => {
  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="banner-image" style={{ backgroundImage: 'url(/banner_learn.png)' }}></div>
        <h1 className="page-title">Documentation & Learn</h1>
        <p className="page-subtitle">Master the DevBox compiler and elevate your coding experience.</p>

        <section className="info-section">
          <h2>Languages Supported</h2>
          <p>DevBox supports a wide array of programming languages out-of-the-box, fully equipped with syntax highlighting, autocomplete, and seamless execution:</p>
          <ul className="feature-list">
            <li><strong>Python (.py)</strong> - Ideal for data science, scripting, and backend web development.</li>
            <li><strong>JavaScript (.js) / TypeScript (.ts)</strong> - Build fast, scalable network applications and web solutions.</li>
            <li><strong>C (.c) / C++ (.cpp)</strong> - High-performance system programming and competitive coding.</li>
            <li><strong>Java (.java)</strong> - Robust object-oriented applications.</li>
            <li><strong>Go (.go)</strong> - Efficient concurrent programming.</li>
            <li><strong>Rust (.rs)</strong> - Safe and ultra-fast systems programming.</li>
            <li><strong>HTML, CSS, JSON, Markdown</strong> - Fully supported for web development and documentation.</li>
          </ul>
        </section>

        <section className="info-section">
          <h2>How to Create a File</h2>
          <div className="step-guide">
            <div className="step">
              <span className="step-number">1</span>
              <div>
                <strong>Navigate to the Explorer Panel</strong>
                <p>On the left side of your DevBox workspace, locate the 'EXPLORER' sidebar.</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <div>
                <strong>Click the 'New File' Icon</strong>
                <p>Click the document icon with a plus sign next to the 'EXPLORER' title.</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <div>
                <strong>Name Your File</strong>
                <p>Enter the file name with its corresponding extension (e.g., <code>main.py</code> or <code>index.js</code>) and hit Enter. The editor will automatically configure the environment for that language.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2>How to Use the Compiler</h2>
          <p>Executing your code is seamless. Once you've written your script:</p>
          <ul className="feature-list">
            <li><strong>Save your work:</strong> Press <code>Ctrl + S</code> or click the Save button in the top right toolbar. Unsaved files will have a dot on their tab.</li>
            <li><strong>Run the code:</strong> Press <code>Ctrl + Enter</code> or click the 'Run' button.</li>
            <li><strong>View Output:</strong> The terminal at the bottom of the screen will display your execution output, errors, and logs instantly.</li>
          </ul>
          <div className="pro-tip">
            <strong>Pro Tip:</strong> DevBox automatically saves your file in the background if you forget, keeping your code secure!
          </div>
        </section>

      </div>
    </div>
  );
};

export default Learn;
