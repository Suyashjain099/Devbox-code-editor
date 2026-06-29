import { useState, useEffect, useCallback, useRef } from "react";
import { MdFolder, MdClose } from "react-icons/md";
import { FaFileCode, FaPlay, FaSave, FaFolderPlus, FaFileMedical, FaTerminal } from "react-icons/fa";
import { VscSave, VscNewFile, VscNewFolder } from "react-icons/vsc";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";
import Terminal from "./components/terminal";
import FileTree from "./components/tree";
import socket from "./socket";
import { Editor } from "@monaco-editor/react";
import { getFileMode } from "./utils/getFileMode";

function App() {
  // ── URL Params + Auth Guard (single parse) ──
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken   = urlParams.get('token');
  const project    = urlParams.get('project') || '';
  const ownerId    = urlParams.get('ownerId') || '';
  const collaboratorId = urlParams.get('collaboratorId') || '';

  // Persist token cross-origin (Edge tracking-prevention safe)
  if (urlToken) {
    try { sessionStorage.setItem('devbox_token', urlToken); } catch(e) {}
    try { localStorage.setItem('token', urlToken); } catch(e) {}
  }
  const authToken = urlToken
    || (() => { try { return sessionStorage.getItem('devbox_token'); } catch(e) { return null; } })()
    || (() => { try { return localStorage.getItem('token'); } catch(e) { return null; } })();

  if (!authToken) {
    window.location.replace(`http://${window.location.hostname}:3000/login`);
    return null;
  }

  // ── State ──────────────────────────────────
  const [fileTree, setFileTree] = useState({});
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedFileContent, setSelectedFileContent] = useState("");
  const [code, setCode] = useState("");
  const [openTabs, setOpenTabs] = useState([]); // Tab system
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [filesWidth, setFilesWidth] = useState(260);
  const [theme, setTheme] = useState("dark");
  const [isRunning, setIsRunning] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });
  const [aiStatus, setAiStatus] = useState('idle'); // 'idle' | 'thinking' | 'done'

  const editorRef = useRef(null);
  const aiDebounceRef = useRef(null);
  const monacoRef = useRef(null);

  const isCollaborator = ownerId !== collaboratorId && ownerId !== "";


  const isSaved = selectedFileContent === code;

  // ── Theme ──────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // ── Auto-save (5s debounce) ────────────────
  useEffect(() => {
    if (!isSaved && code && selectedFile) {
      const timer = setTimeout(() => {
        socket.emit("file:change", { path: selectedFile, content: code, project, ownerId, collaboratorId });
        setSelectedFileContent(code);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [code, selectedFile, isSaved]);

  // ── Reset code when file changes ───────────
  useEffect(() => {
    setCode("");
  }, [selectedFile]);

  useEffect(() => {
    setCode(selectedFileContent);
  }, [selectedFileContent]);

  // ── Fetch file tree ────────────────────────
  const getFileTree = useCallback(async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:9000/files?project=${project}&ownerId=${ownerId}&collaboratorId=${collaboratorId}`);
      const result = await response.json();
      setFileTree(result.tree);
    } catch (err) {
      console.error("Failed to fetch file tree:", err);
    }
  }, [project, ownerId, collaboratorId]);

  // ── Fetch file content ─────────────────────
  const getFileContents = useCallback(async () => {
    if (!selectedFile) return;
    try {
      const response = await fetch(
        `http://${window.location.hostname}:9000/files/content?path=${encodeURIComponent(selectedFile)}&project=${project}&ownerId=${ownerId}&collaboratorId=${collaboratorId}`
      );
      const result = await response.json();
      setSelectedFileContent(result.content);
    } catch (err) {
      console.error("Failed to fetch file content:", err);
    }
  }, [selectedFile]);

  useEffect(() => {
    if (selectedFile) getFileContents();
  }, [getFileContents, selectedFile]);

  useEffect(() => {
    socket.on("file:refresh", getFileTree);
    return () => socket.off("file:refresh", getFileTree);
  }, [getFileTree]);

  // ── Keyboard Shortcuts ─────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleRunClick(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "w") { e.preventDefault(); if (selectedFile) closeTab(selectedFile); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFile, isSaved, code]); // proper deps — don't re-register on every render

  const handleSave = () => {
    if (selectedFile && code) {
      socket.emit("file:change", { path: selectedFile, content: code, project, ownerId, collaboratorId });
      setSelectedFileContent(code);
    }
  };

  // ── Run ────────────────────────────────────
  const handleRunClick = () => {
    if (!selectedFile) return;
    // Save before run
    if (!isSaved) {
      socket.emit("file:change", { path: selectedFile, content: code, project, ownerId, collaboratorId });
      setSelectedFileContent(code);
    }
    setIsRunning(true);
    handleRun(selectedFile);
    setTimeout(() => setIsRunning(false), 2000);
  };

  // ── Tab System ─────────────────────────────
  const openFile = (path) => {
    setSelectedFileContent("");
    setSelectedFile(path);
    if (!openTabs.includes(path)) {
      setOpenTabs((prev) => [...prev, path]);
    }
  };

  const closeTab = (path) => {
    const newTabs = openTabs.filter((t) => t !== path);
    setOpenTabs(newTabs);
    if (selectedFile === path) {
      if (newTabs.length > 0) {
        const lastTab = newTabs[newTabs.length - 1];
        setSelectedFile(lastTab);
      } else {
        setSelectedFile("");
        setCode("");
        setSelectedFileContent("");
      }
    }
  };

  // ── File/Folder Creation ───────────────────
  const handleCreateNewFile = () => {
    const basePath = selectedFile ? selectedFile.substring(0, selectedFile.lastIndexOf("/")) : "";
    const defaultVal = basePath ? basePath + "/" : "";
    const fullPath = prompt("Enter file path:", defaultVal);
    if (!fullPath) return;
    socket.emit("file:create", { path: fullPath, project, ownerId, collaboratorId });
  };

  const handleCreateNewFolder = () => {
    const basePath = selectedFile ? selectedFile.substring(0, selectedFile.lastIndexOf("/")) : "";
    const defaultVal = basePath ? basePath + "/" : "";
    const fullPath = prompt("Enter folder path:", defaultVal);
    if (!fullPath) return;
    socket.emit("folder:create", { path: fullPath, project, ownerId, collaboratorId });
  };

  // ── Resize Handlers ────────────────────────
  const handleMouseMove = useCallback((e) => {
    setTerminalHeight(window.innerHeight - e.clientY);
  }, []);

  const handleMouseUp = useCallback(() => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, [handleMouseMove, handleMouseUp]);

  const handleFilesMouseMove = useCallback((e) => {
    const newWidth = Math.max(180, Math.min(500, e.clientX));
    setFilesWidth(newWidth);
  }, []);

  const handleFilesMouseUp = useCallback(() => {
    document.removeEventListener("mousemove", handleFilesMouseMove);
    document.removeEventListener("mouseup", handleFilesMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [handleFilesMouseMove]);

  const handleFilesMouseDown = useCallback(() => {
    document.addEventListener("mousemove", handleFilesMouseMove);
    document.addEventListener("mouseup", handleFilesMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [handleFilesMouseMove, handleFilesMouseUp]);

  // ── Editor mount handler + AI Ghost Text ──────
  const aiSuggestionRef = useRef('');
  const aiDecorationRef = useRef(null);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({ line: e.position.lineNumber, col: e.position.column });
    });

    const clearGhost = () => {
      const old = document.getElementById('devbox-ai-ghost');
      if (old) old.remove();
      const hint = document.getElementById('devbox-ai-hint');
      if (hint) hint.remove();
      aiSuggestionRef.current = '';
      aiDecorationRef.current = null;
    };


    const showGhost = (text, position) => {
      clearGhost();
      if (!text) return;

      // Get pixel coordinates of cursor
      const coords = editor.getScrolledVisiblePosition(position);
      if (!coords) return;

      // Get the editor DOM container
      const editorDom = editor.getDomNode();
      if (!editorDom) return;

      // Build the ghost element
      const ghostEl = document.createElement('div');
      ghostEl.id = 'devbox-ai-ghost';
      // Show first line as inline ghost, rest as below lines
      const lines = text.split('\n');
      ghostEl.textContent = lines[0];

      const fontInfo = editor.getOption(monaco.editor.EditorOption.fontInfo);
      const fontSize = fontInfo.fontSize || 14;
      const lineHeight = fontInfo.lineHeight || 19;

      // Ghost text
      ghostEl.style.cssText = `
        position: absolute;
        top: ${coords.top}px;
        left: ${coords.left}px;
        color: #858585;
        font-style: italic;
        font-family: ${fontInfo.fontFamily || "'JetBrains Mono', monospace"};
        font-size: ${fontSize}px;
        line-height: ${lineHeight}px;
        pointer-events: none;
        z-index: 10;
        white-space: pre;
        opacity: 0.8;
      `;
      editorDom.style.position = 'relative';
      editorDom.appendChild(ghostEl);

      aiDecorationRef.current = { clear: clearGhost };
      aiSuggestionRef.current = text;

    };

    // Accept function — used by Tab key AND the click badge
    const acceptSuggestion = () => {
      if (!aiSuggestionRef.current) return;
      const pos = editor.getPosition();
      editor.executeEdits('ai-complete', [{
        range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
        text: aiSuggestionRef.current,
        forceMoveMarkers: true
      }]);
      clearGhost();
      editor.focus();
    };



    // Fire AI after user stops typing for 900ms
    editor.onDidChangeModelContent(() => {
      clearGhost();
      clearTimeout(aiDebounceRef.current);

      aiDebounceRef.current = setTimeout(async () => {
        const model = editor.getModel();
        const position = editor.getPosition();
        if (!model || !position) return;

        const codeUpToCursor = model.getValueInRange({
          startLineNumber: 1, startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        console.log('[AI] Triggered. Code length:', codeUpToCursor.trim().length, '| Token present:', !!authToken);


        if (codeUpToCursor.trim().length < 8) return;

        const token = authToken;
        if (!token) { console.warn('[AI] No auth token'); return; }

        const language = model.getLanguageId();
        setAiStatus('thinking');

        try {
          console.log('[AI] Fetching from server...');
          const res = await fetch(`http://${window.location.hostname}:5000/ai/complete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ code: codeUpToCursor, language, cursorLine: position.lineNumber })
          });

          console.log('[AI] Server responded:', res.status, res.ok);
          setAiStatus('done');
          setTimeout(() => setAiStatus('idle'), 2000);

          if (!res.ok) { console.warn('[AI] Request failed:', res.status); return; }
          const data = await res.json();
          console.log('[AI] Data from server:', JSON.stringify(data).substring(0, 100));
          const completion = (data.completion || '').trim();
          console.log('[AI] Completion length:', completion.length, '| Preview:', completion.substring(0, 50));
          if (!completion) return;

          const currentPos = editor.getPosition();
          showGhost(completion, currentPos);
        } catch (err) {
          setAiStatus('idle');
          console.error('[AI Error]', err.message, err.stack);
        }

      }, 900);
    });

    // Tab: accept AI suggestion OR default indent
    editor.addCommand(monaco.KeyCode.Tab, () => {
      if (aiSuggestionRef.current) {
        acceptSuggestion();
      } else {
        editor.trigger('keyboard', 'tab', {});
      }
    });

    // Escape: dismiss suggestion
    editor.addCommand(monaco.KeyCode.Escape, () => { clearGhost(); });

  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // ── Get file name from path ────────────────
  const getFileName = (filePath) => filePath.split("/").pop();

  // ── Get language label ─────────────────────
  const getLanguageLabel = () => {
    if (!selectedFile) return "";
    const ext = selectedFile.split(".").pop().toLowerCase();
    const map = {
      py: "Python", js: "JavaScript", ts: "TypeScript", jsx: "JavaScript React",
      tsx: "TypeScript React", c: "C", cpp: "C++", java: "Java", go: "Go",
      rs: "Rust", html: "HTML", css: "CSS", json: "JSON", md: "Markdown",
    };
    return map[ext] || ext.toUpperCase();
  };

  // ── Render ─────────────────────────────────
  return (
    <div className="playground-container">
      {/* ── Editor Area ── */}
      <div className="editor-container">
        {/* ── Sidebar ── */}
        <div className="sidebar" style={{ width: `${filesWidth}px` }}>
          {/* Dashboard Back Button */}
          <a
            href={`http://${window.location.hostname}:3000`}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 12px',
              background: 'linear-gradient(90deg, #7c3aed22, transparent)',
              borderBottom: '1px solid var(--border)',
              color: '#a78bfa',
              textDecoration: 'none',
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.03em',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(90deg, #7c3aed44, transparent)'}
            onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(90deg, #7c3aed22, transparent)'}
            title="Back to Dashboard"
          >
            <span style={{ fontSize: '0.9rem' }}>⬅</span>
            <span>Dashboard</span>
          </a>

          <div className="sidebar-header">
            <span className="sidebar-title">EXPLORER</span>
            <div className="sidebar-actions">
              <button className="icon-btn" onClick={handleCreateNewFile} title="New File">
                <FaFileMedical size={16} />
              </button>
              <button className="icon-btn" onClick={handleCreateNewFolder} title="New Folder">
                <FaFolderPlus size={16} />
              </button>
            </div>
          </div>

          {/* ── Global Collaboration Actions ── */}
          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            {isCollaborator && (
              <button
                className="toolbar-btn"
                style={{ background: '#d97706', color: 'white', width: '100%', justifyContent: 'center' }}
                onClick={async () => {
                  if (!window.confirm("Push your changes to the main workspace? This will overwrite the owner's code with your branch.")) return;
                  try {
                    const res = await fetch(`http://${window.location.hostname}:9000/push`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ project, ownerId, collaboratorId })
                    });
                    const data = await res.json();
                    alert(data.msg || data.error);
                  } catch (err) {
                    alert("Failed to push changes");
                  }
                }}
                title="Merge Branch to Main"
              >
                <span>🚀 Push to Global</span>
              </button>
            )}
            <button
              className="toolbar-btn"
              style={{ background: '#2563eb', color: 'white', width: '100%', justifyContent: 'center' }}
              onClick={async () => {
                if (isCollaborator) {
                  if (!window.confirm("Pull changes from the main workspace? This will overwrite your branch with the owner's code.")) return;
                  try {
                    const res = await fetch(`http://${window.location.hostname}:9000/pull`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ project, ownerId, collaboratorId })
                    });
                    const data = await res.json();
                    alert(data.msg || data.error);
                    // Refresh the current file if it's open
                    getFileTree();
                    if (selectedFile) getFileContents();
                  } catch (err) {
                    alert("Failed to pull changes");
                  }
                } else {
                  // For Owner: Just refresh the view since global files are already updated
                  if (!window.confirm("Reload files to view newest global changes?")) return;
                  getFileTree();
                  if (selectedFile) getFileContents();
                  alert("Refreshed with latest global changes!");
                }
              }}
              title="Fetch Latest Global Changes"
            >
              <span>📥 Pull from Global</span>
            </button>
          </div>
          <div className="sidebar-files">
            <FileTree
              onSelect={openFile}
              tree={fileTree}
              selectedFile={selectedFile}
            />
          </div>
        </div>

        {/* ── Vertical Resize Handle ── */}
        <div className="drag-handle-vertical" onMouseDown={handleFilesMouseDown} />

        {/* ── Main Editor Panel ── */}
        <div className="editor-panel">
          {/* ── Tabs ── */}
          {openTabs.length > 0 && (
            <div className="tabs-bar">
              {openTabs.map((tab) => (
                <div
                  key={tab}
                  className={`tab ${tab === selectedFile ? "tab-active" : ""}`}
                  onClick={() => openFile(tab)}
                >
                  <span className="tab-name">{getFileName(tab)}</span>
                  {tab === selectedFile && !isSaved && <span className="tab-unsaved">●</span>}
                  <button
                    className="tab-close"
                    onClick={(e) => { e.stopPropagation(); closeTab(tab); }}
                  >
                    <MdClose size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Toolbar ── */}
          {selectedFile && (
            <div className="toolbar">
              <div className="toolbar-left">
                <span className="breadcrumb">
                  {selectedFile.split("/").map((part, i, arr) => (
                    <span key={i}>
                      <span className={i === arr.length - 1 ? "breadcrumb-active" : "breadcrumb-part"}>
                        {part}
                      </span>
                      {i < arr.length - 1 && <span className="breadcrumb-sep">/</span>}
                    </span>
                  ))}
                </span>
              </div>
              <div className="toolbar-right">
                <button
                  className={`toolbar-btn save-btn ${isSaved ? "saved" : "unsaved"}`}
                  onClick={handleSave}
                  disabled={isSaved}
                  title="Save (Ctrl+S)"
                >
                  <FaSave size={14} />
                  <span>{isSaved ? "Saved" : "Save"}</span>
                </button>
                <button
                  className={`toolbar-btn run-btn ${isRunning ? "running" : ""}`}
                  onClick={handleRunClick}
                  title="Run (Ctrl+Enter)"
                >
                  <FaPlay size={12} fill="currentColor" />
                  <span>{isRunning ? "Running..." : "Run"}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Editor / Welcome Screen ── */}
          {selectedFile ? (
            <Editor
              height="100%"
              width="100%"
              language={getFileMode({ selectedFile }) || "javascript"}
              theme={theme === "light" ? "vs-light" : "vs-dark"}
              value={code}
              onChange={(val) => setCode(val || "")}
              onMount={handleEditorMount}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: true, scale: 1 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                bracketPairColorization: { enabled: true },
                autoClosingBrackets: "always",
                autoClosingQuotes: "always",
                formatOnPaste: true,
                suggestOnTriggerCharacters: true,
                wordWrap: "off",
                lineNumbers: "on",
                renderLineHighlight: "all",
                padding: { top: 12 },
                inlineSuggest: { enabled: true }, // enables ghost-text AI completions
              }}
            />
          ) : (
            <motion.div 
              className="welcome-screen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="welcome-content">
                <h1 className="welcome-title">
                  <span className="welcome-gradient">DevBox IDE</span>
                </h1>
                <p className="welcome-subtitle">Professional cloud workspace. Open a file to begin.</p>
                <div className="welcome-shortcuts">
                  <div className="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>S</kbd>
                    <span>Save File</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
                    <span>Run Code</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>W</kbd>
                    <span>Close Tab</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Right Click</kbd>
                    <span>Context Menu</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Horizontal Resize Handle ── */}
      <div className="drag-handle" onMouseDown={handleMouseDown} />

      {/* ── Terminal Panel ── */}
      <div className="terminal-container" style={{ height: terminalHeight }}>
        <div className="terminal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaTerminal size={14} color="var(--text-muted)" />
            <span className="terminal-title">TERMINAL</span>
          </div>
          <span className="terminal-info">bash</span>
        </div>
        <div className="terminal-body">
          <Terminal />
        </div>
      </div>

      <div className="status-bar">
        <div className="status-left">
          <span className="status-item">🐳 Docker</span>
          {selectedFile && <span className="status-item">{getLanguageLabel()}</span>}
          {/* AI Status indicator */}
          <span className="status-item" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
              background: aiStatus === 'thinking' ? '#a78bfa' : aiStatus === 'done' ? '#10b981' : '#4ade80',
              boxShadow: aiStatus === 'thinking' ? '0 0 6px #a78bfa' : aiStatus === 'done' ? '0 0 6px #10b981' : 'none',
              transition: 'all 0.3s'
            }} />
            AI {aiStatus === 'thinking' ? 'thinking' : 'ready'}
          </span>
        </div>
        <div className="status-right">
          {selectedFile && (
            <span className="status-item">
              Ln {cursorPosition.line}, Col {cursorPosition.col}
            </span>
          )}
          <span className="status-item">UTF-8</span>
          {/* Animated theme toggle switch */}
          <span
            className="status-item"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', userSelect: 'none' }}
          >
            <span style={{ fontSize: '12px' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
            {/* Toggle switch pill */}
            <span style={{
              display: 'inline-flex', width: 32, height: 16, borderRadius: 8,
              background: theme === 'dark' ? '#6d28d9' : '#d1d5db',
              position: 'relative', transition: 'background 0.3s', flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.15)'
            }}>
              <span style={{
                position: 'absolute', top: 2,
                left: theme === 'dark' ? 'calc(100% - 14px)' : 2,
                width: 10, height: 10, borderRadius: '50%',
                background: 'white',
                transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
              }} />
            </span>
            <span style={{ fontSize: '11px' }}>{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;

// ─────────────────────────────────────────────
// Run Command Handler
// ─────────────────────────────────────────────
const handleRun = (filePath) => {
  if (!filePath) return;
  const urlParams = new URLSearchParams(window.location.search);
  const project = urlParams.get("project") || "";
  const extension = filePath.split(".").pop().toLowerCase();
  const nameWithoutExt = filePath.replace(/\.[^/.]+$/, "");

  switch (extension) {
    case "py":
      return socket.emit("terminal:write", `python3 "${filePath}"\n`, project);
    case "js":
      return socket.emit("terminal:write", `node "${filePath}"\n`, project);
    case "ts":
      return socket.emit("terminal:write", `npx ts-node "${filePath}"\n`, project);
    case "c":
      return socket.emit("terminal:write", `gcc "${filePath}" -o "${nameWithoutExt}" && ./"${nameWithoutExt}"\n`, project);
    case "cpp":
    case "cxx":
      return socket.emit("terminal:write", `g++ "${filePath}" -o "${nameWithoutExt}" && ./"${nameWithoutExt}"\n`, project);
    case "java":
      return socket.emit("terminal:write", `java "${filePath}"\n`, project);
    case "go":
      return socket.emit("terminal:write", `go run "${filePath}"\n`, project);
    case "rs":
      return socket.emit("terminal:write", `rustc "${filePath}" -o "${nameWithoutExt}" && ./"${nameWithoutExt}"\n`, project);
    default:
      console.log("Unsupported file type:", extension);
  }
};