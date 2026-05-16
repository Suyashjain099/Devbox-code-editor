import React from 'react';
import './PageStyles.css';

const Community = () => {
  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="banner-image" style={{ backgroundImage: 'url(/banner_community.png)' }}></div>
        <h1 className="page-title">Community & Collaboration</h1>
        <p className="page-subtitle">Code is better together. Discover how DevBox empowers teams.</p>

        <section className="info-section collaboration-highlight">
          <h2>The DevBox Collaboration Engine</h2>
          <p>
            DevBox was built from the ground up to support modern distributed teams. 
            Whether you're pair programming for an interview, debugging with a colleague, 
            or teaching a student, our platform keeps everyone in sync.
          </p>
          
          <div className="collab-features">
            <div className="collab-item">
              <h3>Live Workspace Sharing</h3>
              <p>Every project has a unique URL. Add collaborators and they instantly get access to a live snapshot of your code.</p>
            </div>
            <div className="collab-item">
              <h3>Branching & Merging</h3>
              <p>Collaborators work in their own isolated view. Use the <strong>"Push to Global"</strong> and <strong>"Pull from Global"</strong> buttons in the IDE toolbar to merge changes safely without overwriting each other's active work.</p>
            </div>
            <div className="collab-item">
              <h3>Real-Time File Tree Sync</h3>
              <p>When a collaborator adds or deletes a file, your workspace updates instantly via WebSockets. No manual refreshes required.</p>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2>How to Start Collaborating</h2>
          <div className="step-guide">
            <div className="step">
              <span className="step-number">1</span>
              <div>
                <strong>Create a Project</strong>
                <p>Log into your Dashboard and create a new project. You are now the "Owner".</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <div>
                <strong>Share Access</strong>
                <p>Click the "Add Collaborator" button on your project card and enter their email.</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <div>
                <strong>Code Together</strong>
                <p>Collaborators open the project from their dashboard. They can test ideas locally and click "Push to Global" when ready to share.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Community;
