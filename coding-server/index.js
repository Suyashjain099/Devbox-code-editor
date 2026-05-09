const http = require('http');
const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const { Server: SocketServer } = require('socket.io');
const path = require('path');
const cors = require('cors');
const chokidar = require('chokidar');
const pty = require('node-pty');

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 9000;
const userDir = path.join(__dirname, 'user');

const getBaseDir = (ownerId, collaboratorId, project) => {
  if (ownerId && project) {
    if (collaboratorId && collaboratorId !== ownerId) {
      return path.join(userDir, ownerId, `${project}_branch_${collaboratorId}`);
    }
    return path.join(userDir, ownerId, project);
  }
  // Fallback
  return ownerId ? path.join(userDir, ownerId) : project ? path.join(userDir, project) : userDir;
};

// Ensure user directory exists
if (!fsSync.existsSync(userDir)) {
  fsSync.mkdirSync(userDir, { recursive: true });
}

// ─────────────────────────────────────────────
// Express + Socket.IO Setup
// ─────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─────────────────────────────────────────────
// Terminal Process (node-pty)
// ─────────────────────────────────────────────
let ptyProcess = null;

function createPtyProcess() {
  const proc = pty.spawn('bash', [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    cwd: userDir,
    env: { ...process.env, TERM: 'xterm-256color' }
  });

  proc.onData(data => {
    console.log('[PTY Output]', JSON.stringify(data));
    // Broadcast terminal output to ALL connected clients
    io.emit('terminal:data', data);
  });

  proc.on('exit', (exitCode, signal) => {
    console.log(`[PTY] Exited (code: ${exitCode}). Restarting...`);
    setTimeout(() => {
      ptyProcess = createPtyProcess();
    }, 500);
  });

  console.log('[PTY] Bash terminal spawned');
  return proc;
}

ptyProcess = createPtyProcess();

// ─────────────────────────────────────────────
// File Watcher (Chokidar) — debounced
// ─────────────────────────────────────────────
let refreshTimeout = null;
const watcher = chokidar.watch(userDir, {
  ignored: /(^|[\/\\])\.|node_modules/,
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 200 }
});

watcher.on('all', () => {
  // Debounce file refresh to avoid flooding
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(() => {
    io.emit('file:refresh');
  }, 300);
});

// ─────────────────────────────────────────────
// Socket.IO Connection Handler
// ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Send initial file tree refresh
  socket.emit('file:refresh');

  // Send a newline to PTY to trigger a fresh bash prompt for this client
  setTimeout(() => {
    if (ptyProcess) {
      ptyProcess.write('\n');
    }
  }, 200);

  // ── File Operations ──────────────────────
  socket.on('file:change', async ({ path: filePath, content, project, ownerId, collaboratorId }) => {
    if (!filePath) return;
    try {
      const baseDir = getBaseDir(ownerId, collaboratorId, project);
      const fullPath = path.join(baseDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
      
      // Sync to MongoDB
      // If collaborator, save to DB under their own ID to isolate state
      const dbUserId = (collaboratorId && collaboratorId !== ownerId) ? collaboratorId : ownerId;
      if (dbUserId && project) {
        fetch('http://parth-auth-server:5000/files/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: dbUserId, projectName: project, path: filePath, content, isDirectory: false })
        }).catch(err => console.error('Failed to sync to DB:', err));
      }
    } catch (err) {
      console.error('[File:Change] Error:', err.message);
      socket.emit('error', { message: 'Failed to save file' });
    }
  });

  socket.on('file:create', async ({ path: filePath, project, ownerId, collaboratorId }) => {
    if (!filePath) return;
    try {
      const baseDir = getBaseDir(ownerId, collaboratorId, project);
      const fullPath = path.join(baseDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, '');
      io.emit('file:refresh');
      
      // Sync to MongoDB
      const dbUserId = (collaboratorId && collaboratorId !== ownerId) ? collaboratorId : ownerId;
      if (dbUserId && project) {
        fetch('http://parth-auth-server:5000/files/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: dbUserId, projectName: project, path: filePath, content: '', isDirectory: false })
        }).catch(err => console.error('Failed to sync to DB:', err));
      }
    } catch (err) {
      console.error('[File:Create] Error:', err.message);
      socket.emit('error', { message: 'Failed to create file' });
    }
  });

  socket.on('file:delete', async ({ path: filePath, project, ownerId, collaboratorId }) => {
    if (!filePath) return;
    try {
      const baseDir = getBaseDir(ownerId, collaboratorId, project);
      const fullPath = path.join(baseDir, filePath);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
      } else {
        await fs.unlink(fullPath);
      }
      io.emit('file:refresh');
      
      // Sync to MongoDB
      const dbUserId = (collaboratorId && collaboratorId !== ownerId) ? collaboratorId : ownerId;
      if (dbUserId && project) {
        fetch('http://parth-auth-server:5000/files/sync', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: dbUserId, projectName: project, path: filePath })
        }).catch(err => console.error('Failed to delete in DB:', err));
      }
    } catch (err) {
      console.error('[File:Delete] Error:', err.message);
      socket.emit('error', { message: 'Failed to delete' });
    }
  });

  socket.on('file:rename', async ({ oldPath, newPath, project, ownerId, collaboratorId }) => {
    if (!oldPath || !newPath) return;
    try {
      const baseDir = getBaseDir(ownerId, collaboratorId, project);
      const fullOld = path.join(baseDir, oldPath);
      const fullNew = path.join(baseDir, newPath);
      await fs.mkdir(path.dirname(fullNew), { recursive: true });
      await fs.rename(fullOld, fullNew);
      io.emit('file:refresh');
      
      // Sync to MongoDB
      const dbUserId = (collaboratorId && collaboratorId !== ownerId) ? collaboratorId : ownerId;
      if (dbUserId && project) {
        fetch('http://parth-auth-server:5000/files/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: dbUserId, projectName: project, oldPath, newPath })
        }).catch(err => console.error('Failed to rename in DB:', err));
      }
    } catch (err) {
      console.error('[File:Rename] Error:', err.message);
      socket.emit('error', { message: 'Failed to rename' });
    }
  });

  socket.on('folder:create', async ({ path: folderPath, project, ownerId, collaboratorId }) => {
    if (!folderPath) return;
    try {
      const baseDir = getBaseDir(ownerId, collaboratorId, project);
      await fs.mkdir(path.join(baseDir, folderPath), { recursive: true });
      io.emit('file:refresh');
      
      // Sync to MongoDB
      const dbUserId = (collaboratorId && collaboratorId !== ownerId) ? collaboratorId : ownerId;
      if (dbUserId && project) {
        fetch('http://parth-auth-server:5000/files/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: dbUserId, projectName: project, path: folderPath, content: '', isDirectory: true })
        }).catch(err => console.error('Failed to sync folder to DB:', err));
      }
    } catch (err) {
      console.error('[Folder:Create] Error:', err.message);
      socket.emit('error', { message: 'Failed to create folder' });
    }
  });

  // ── Terminal Operations ──────────────────
  socket.on('terminal:write', (data, project, ownerId, collaboratorId) => {
    if (ptyProcess) {
      if (data === "cd_project") {
        if (ownerId && project) {
          const baseDir = getBaseDir(ownerId, collaboratorId, project);
          ptyProcess.write(`cd "${baseDir}"\n`);
        } else if (project) {
          ptyProcess.write(`cd "/app/user/${project}"\n`);
        }
        return;
      }
      ptyProcess.write(data);
    }
  });

  socket.on('terminal:resize', ({ cols, rows }) => {
    try {
      if (ptyProcess && cols && rows) {
        ptyProcess.resize(Math.max(cols, 10), Math.max(rows, 2));
      }
    } catch (err) {
      // ignore resize errors
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// ─────────────────────────────────────────────
// REST API Routes
// ─────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Get file tree
app.get('/files', async (req, res) => {
  try {
    const { project, ownerId, collaboratorId } = req.query;
    const targetDir = getBaseDir(ownerId, collaboratorId, project);
    
    // Check if directory exists locally
    if (!fsSync.existsSync(targetDir)) {
      fsSync.mkdirSync(targetDir, { recursive: true });
      
      // Pull files from MongoDB.
      // If we are a collaborator creating our branch for the first time,
      // we must fetch the OWNER's files to seed our directory.
      const fetchUserId = (collaboratorId && collaboratorId !== ownerId) ? ownerId : ownerId;
      
      if (fetchUserId && project) {
        try {
          const response = await fetch(`http://parth-auth-server:5000/files/project?userId=${fetchUserId}&projectName=${project}`);
          if (response.ok) {
            const data = await response.json();
            for (const file of data.files) {
              const filePath = path.join(targetDir, file.path);
              if (file.isDirectory) {
                await fs.mkdir(filePath, { recursive: true });
              } else {
                await fs.mkdir(path.dirname(filePath), { recursive: true });
                await fs.writeFile(filePath, file.content || '');
              }
            }
          }
        } catch (fetchErr) {
          console.error("Error pulling initial files from MongoDB:", fetchErr.message);
        }
      }
    }
    

    const fileTree = await generateFileTree(targetDir);
    return res.json({ tree: fileTree });
  } catch (err) {
    console.error('[API /files] Error:', err.message);
    return res.status(500).json({ error: 'Failed to read file tree' });
  }
});

// Get file content
app.get('/files/content', async (req, res) => {
  try {
    const { path: filePath, project, ownerId, collaboratorId } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' });
    }
    const baseDir = getBaseDir(ownerId, collaboratorId, project);
    const fullPath = path.join(baseDir, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return res.json({ content });
  } catch (err) {
    console.error('[API /files/content] Error:', err.message);
    return res.status(404).json({ error: 'File not found', content: '' });
  }
});

// Push changes to global
app.post('/push', async (req, res) => {
  try {
    const { project, ownerId, collaboratorId } = req.body;
    if (!project || !ownerId || !collaboratorId) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const collabDir = getBaseDir(ownerId, collaboratorId, project);
    const ownerDir = getBaseDir(ownerId, ownerId, project);

    // Recursively copy files from collaborator to owner
    await fs.cp(collabDir, ownerDir, { recursive: true, force: true });

    // Sync to DB
    fetch('http://parth-auth-server:5000/files/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId, collaboratorId, projectName: project })
    }).catch(err => console.error('Failed to sync push to DB:', err));

    return res.json({ msg: 'Successfully pushed to global workspace!' });
  } catch (err) {
    console.error('[API /push] Error:', err.message);
    return res.status(500).json({ error: 'Failed to push changes' });
  }
});

// Pull changes from global
app.post('/pull', async (req, res) => {
  try {
    const { project, ownerId, collaboratorId } = req.body;
    if (!project || !ownerId || !collaboratorId) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const collabDir = getBaseDir(ownerId, collaboratorId, project);
    const ownerDir = getBaseDir(ownerId, ownerId, project);

    // Recursively copy files from owner to collaborator
    await fs.cp(ownerDir, collabDir, { recursive: true, force: true });

    // Sync to DB
    fetch('http://parth-auth-server:5000/files/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId, collaboratorId, projectName: project })
    }).catch(err => console.error('Failed to sync pull to DB:', err));

    return res.json({ msg: 'Successfully pulled from global workspace!' });
  } catch (err) {
    console.error('[API /pull] Error:', err.message);
    return res.status(500).json({ error: 'Failed to pull changes' });
  }
});

// Create folder
app.post('/folder', async (req, res) => {
  try {
    const folderPath = req.body.path;
    const project = req.body.project;
    if (!folderPath) {
      return res.status(400).json({ error: 'Path is required' });
    }
    const baseDir = project ? path.join(userDir, project) : userDir;
    await fs.mkdir(path.join(baseDir, folderPath), { recursive: true });
    io.emit('file:refresh');
    return res.json({ success: true });
  } catch (err) {
    console.error('[API /folder] Error:', err.message);
    return res.status(500).json({ error: 'Failed to create folder' });
  }
});

// ─────────────────────────────────────────────
// File Tree Generator (sorted: folders first)
// ─────────────────────────────────────────────
async function generateFileTree(directory) {
  const tree = {};

  async function buildTree(currentDir, currentTree) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      if (entry.isDirectory()) {
        currentTree[entry.name] = {};
        await buildTree(path.join(currentDir, entry.name), currentTree[entry.name]);
      } else {
        currentTree[entry.name] = null;
      }
    }
  }

  await buildTree(directory, tree);
  return tree;
}

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🐳 DevBox Coding Server running on port ${PORT}`);
  console.log(`   Terminal: bash @ ${userDir}`);
  console.log(`   Languages: Python, Node.js, C, C++, Java, Go, Rust, TypeScript`);
});

// Global Error Handlers
process.on('uncaughtException', (error) => {
  console.error('[Process] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled Rejection:', reason);
});