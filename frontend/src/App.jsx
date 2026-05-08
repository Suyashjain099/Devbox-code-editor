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
  // ── Auth Guard ─────────────────────────────
  // If no token, send user to the login page immediately
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.replace('http://localhost:3000/login');
    return null; // render nothing while redirecting
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

  const editorRef = useRef(null);

  const urlParams = new URLSearchParams(window.location.search);
  const project = urlParams.get("project") || "";
  const userId = urlParams.get("userId") || "";

  const isSaved = selectedFileContent === code;

  // ── Theme ──────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // ── Auto-save (5s debounce) ────────────────
  useEffect(() => {
    if (!isSaved && code && selectedFile) {
      const timer = setTimeout(() => {
        socket.emit("file:change", { path: selectedFile, content: code, project, userId });
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
      const response = await fetch(`http://localhost:9000/files?project=${project}&userId=${userId}`);
      const result = await response.json();
      setFileTree(result.tree);
    } catch (err) {
      console.error("Failed to fetch file tree:", err);
    }
  }, []);

  // ── Fetch file content ─────────────────────
  const getFileContents = useCallback(async () => {
    if (!selectedFile) return;
    try {
      const response = await fetch(
        `http://localhost:9000/files/content?path=${encodeURIComponent(selectedFile)}&project=${project}&userId=${userId}`
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
      // Ctrl+S → Save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+Enter → Run
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunClick();
      }
      // Ctrl+W → Close tab
      if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault();
        if (selectedFile) closeTab(selectedFile);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // ── Save ───────────────────────────────────
  const handleSave = () => {
    if (selectedFile && code) {
      socket.emit("file:change", { path: selectedFile, content: code, project, userId });
      setSelectedFileContent(code);
    }
  };

  // ── Run ────────────────────────────────────
  const handleRunClick = () => {
    if (!selectedFile) return;
    // Save before run
    if (!isSaved) {
      socket.emit("file:change", { path: selectedFile, content: code, project, userId });
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
    socket.emit("file:create", { path: fullPath, project, userId });
  };

  const handleCreateNewFolder = () => {
    const basePath = selectedFile ? selectedFile.substring(0, selectedFile.lastIndexOf("/")) : "";
    const defaultVal = basePath ? basePath + "/" : "";
    const fullPath = prompt("Enter folder path:", defaultVal);
    if (!fullPath) return;
    socket.emit("folder:create", { path: fullPath, project, userId });
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

  // ── Editor mount handler ───────────────────
  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({ line: e.position.lineNumber, col: e.position.column });
    });
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

      {/* ── Status Bar ── */}
      <div className="status-bar">
        <div className="status-left">
          <span className="status-item">🐳 Docker</span>
          {selectedFile && <span className="status-item">{getLanguageLabel()}</span>}
        </div>
        <div className="status-right">
          {selectedFile && (
            <span className="status-item">
              Ln {cursorPosition.line}, Col {cursorPosition.col}
            </span>
          )}
          <span className="status-item">UTF-8</span>
          <span className="status-item" style={{ cursor: "pointer" }} onClick={toggleTheme}>
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
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