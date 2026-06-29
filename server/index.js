require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require("cors");
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');
const dns = require('dns');
const rateLimit = require('express-rate-limit');
const Project = require('./model/Project');
const File = require('./model/File');
const Invitation = require('./model/Invitation');

const JWT_SECRET = process.env.JWT_SECRET || 'devbox_fallback_secret_change_me';

// Force Node.js to use Google DNS, bypassing mobile hotspot DNS blocking
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();
app.set('trust proxy', 1);

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cors());

// ── Rate Limiters ──────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                  // max 10 attempts per IP
    message: { msg: 'Too many attempts from this IP. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60,                 // 60 requests/min for general API
    message: { msg: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply general limiter to all API routes
app.use('/projects', apiLimiter);
app.use('/invites', apiLimiter);
app.use('/files', apiLimiter);

// ── Path Sanitization Helper ───────────────
// Prevents path traversal attacks like '../../etc/passwd' on Unix and Windows
const sanitizePath = (filePath) => {
    if (typeof filePath !== 'string') return null;
    const virtualRoot = path.resolve('/safe_root');
    const resolved = path.resolve(virtualRoot, filePath);
    if (!resolved.startsWith(virtualRoot)) {
        return null;
    }
    return path.relative(virtualRoot, resolved).replace(/\\/g, '/');
};

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/devbox';
mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const User = require('./model/User');

// Routes

// Serve homepage
app.get('/', (req, res) => {
    console.log('Serving homepage');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve signup page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Signup route
app.post('/signup', authLimiter, async (req, res) => {
    const { email, password, confirmPassword } = req.body;

    // Check if passwords match
    if (password !== confirmPassword) {
        return res.status(400).json({ msg: 'Passwords do not match' });
    }

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Hash the password and save the user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();

        // Return success JSON
        res.status(201).json({ msg: 'User registered successfully.' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ msg: 'Database error while creating user' });
    }
});


// Login route
app.post('/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'User not found. Please sign up first.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid password' });
        }

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, msg: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ msg: 'Database error during login' });
    }
});

// ── Auth Middleware ─────────────────────────
const authMiddleware = (req, res, next) => {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ msg: 'No token provided' });
    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        return res.status(401).json({ msg: 'Invalid or expired token' });
    }
};

// ── Project Routes ──────────────────────────

// GET /projects — list all projects for the logged-in user
app.get('/projects', authMiddleware, async (req, res) => {
    try {
        const myProjects = await Project.find({ userId: req.userId }).sort({ createdAt: -1 });
        const sharedProjects = await Project.find({ collaborators: req.userId })
            .populate('userId', 'email')
            .sort({ createdAt: -1 });
            
        res.json({ projects: myProjects, sharedProjects });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

// POST /projects — create a new project for the logged-in user
app.post('/projects', authMiddleware, async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ msg: 'Project name is required' });
    }
    try {
        const project = new Project({ userId: req.userId, name: name.trim() });
        await project.save();
        // Also create the directory in coding-server via REST
        try {
            await fetch(`http://coding-server:9000/folder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: name.trim(), userId: req.userId })
            });
        } catch (fsErr) {
            console.warn('Could not create folder in coding-server:', fsErr.message);
        }
        res.status(201).json({ project });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'A project with that name already exists' });
        }
        res.status(500).json({ msg: 'Server error' });
    }
});

// DELETE /projects/:name — delete a project
app.delete('/projects/:name', authMiddleware, async (req, res) => {
    try {
        await Project.deleteOne({ userId: req.userId, name: req.params.name });
        await File.deleteMany({ userId: req.userId, projectName: req.params.name });
        res.json({ msg: 'Project deleted' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

// ── Invitation Routes ────────────────────────

// Send an invite
app.post('/invites/send', authMiddleware, async (req, res) => {
    const { projectId, email } = req.body;
    try {
        const receiver = await User.findOne({ email });
        if (!receiver) return res.status(404).json({ msg: 'User not found' });
        
        if (receiver._id.toString() === req.userId) {
            return res.status(400).json({ msg: 'You cannot invite yourself' });
        }

        const project = await Project.findOne({ _id: projectId, userId: req.userId });
        if (!project) return res.status(404).json({ msg: 'Project not found or unauthorized' });

        if (project.collaborators.includes(receiver._id)) {
            return res.status(400).json({ msg: 'User is already a collaborator' });
        }

        const existingInvite = await Invitation.findOne({ projectId, receiverId: receiver._id, status: 'pending' });
        if (existingInvite) return res.status(400).json({ msg: 'Invitation already sent' });

        const invite = new Invitation({
            projectId,
            senderId: req.userId,
            receiverId: receiver._id
        });
        await invite.save();
        res.status(201).json({ msg: 'Invitation sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Get pending invites for me
app.get('/invites', authMiddleware, async (req, res) => {
    try {
        const invites = await Invitation.find({ receiverId: req.userId, status: 'pending' })
            .populate('senderId', 'email')
            .populate('projectId', 'name');
        res.json({ invites });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Accept an invite
app.post('/invites/accept/:inviteId', authMiddleware, async (req, res) => {
    try {
        const invite = await Invitation.findOne({ _id: req.params.inviteId, receiverId: req.userId, status: 'pending' });
        if (!invite) return res.status(404).json({ msg: 'Invite not found or already processed' });

        invite.status = 'accepted';
        await invite.save();

        await Project.findByIdAndUpdate(invite.projectId, {
            $addToSet: { collaborators: req.userId }
        });

        res.json({ msg: 'Invitation accepted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Reject an invite
app.post('/invites/reject/:inviteId', authMiddleware, async (req, res) => {
    try {
        const invite = await Invitation.findOne({ _id: req.params.inviteId, receiverId: req.userId, status: 'pending' });
        if (!invite) return res.status(404).json({ msg: 'Invite not found or already processed' });

        invite.status = 'rejected';
        await invite.save();

        res.json({ msg: 'Invitation rejected' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ── File Sync Routes (Internal use between servers) ────────

// Upsert a file or folder
app.post('/files/sync', async (req, res) => {
    const { userId, projectName, path: rawPath, content, isDirectory } = req.body;
    const path = sanitizePath(rawPath);
    if (!path) return res.status(400).json({ msg: 'Invalid file path' });
    try {
        await File.findOneAndUpdate(
            { userId, projectName, path },
            { content: content || '', isDirectory: !!isDirectory, updatedAt: Date.now() },
            { upsert: true, new: true }
        );
        res.status(200).json({ msg: 'File synced' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Delete a file or folder
app.delete('/files/sync', async (req, res) => {
    const { userId, projectName, path: rawPath } = req.body;
    const path = sanitizePath(rawPath);
    if (!path) return res.status(400).json({ msg: 'Invalid file path' });
    try {
        // Delete the exact file/folder
        await File.deleteOne({ userId, projectName, path });
        // Also delete any nested files if it was a directory
        await File.deleteMany({ userId, projectName, path: new RegExp(`^${path}/`) });
        res.status(200).json({ msg: 'File deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Rename a file or folder
app.post('/files/rename', async (req, res) => {
    const { userId, projectName, oldPath: rawOld, newPath: rawNew } = req.body;
    const oldPath = sanitizePath(rawOld);
    const newPath = sanitizePath(rawNew);
    if (!oldPath || !newPath) return res.status(400).json({ msg: 'Invalid file paths' });
    try {
        const file = await File.findOne({ userId, projectName, path: oldPath });
        if (file) {
            file.path = newPath;
            await file.save();
        }
        
        // Find and rename all nested files
        const nestedFiles = await File.find({ userId, projectName, path: new RegExp(`^${oldPath}/`) });
        for (const nested of nestedFiles) {
            nested.path = nested.path.replace(new RegExp(`^${oldPath}`), newPath);
            await nested.save();
        }
        
        res.status(200).json({ msg: 'File renamed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Push collaborator branch to owner (main)
app.post('/files/push', async (req, res) => {
    const { ownerId, collaboratorId, projectName } = req.body;
    if (!ownerId || !collaboratorId || !projectName) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    try {
        const collabFiles = await File.find({ userId: collaboratorId, projectName });
        
        // Wipe existing owner files for this project to accurately reflect deletions
        await File.deleteMany({ userId: ownerId, projectName });

        // Insert fresh snapshot from collaborator
        for (const file of collabFiles) {
            await File.create({
                userId: ownerId, 
                projectName, 
                path: file.path,
                content: file.content, 
                isDirectory: file.isDirectory, 
                updatedAt: Date.now()
            });
        }
        res.status(200).json({ msg: 'Pushed to global successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Pull global to collaborator branch
app.post('/files/pull', async (req, res) => {
    const { ownerId, collaboratorId, projectName } = req.body;
    if (!ownerId || !collaboratorId || !projectName) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    try {
        const ownerFiles = await File.find({ userId: ownerId, projectName });
        
        // Wipe existing collaborator files for this project to accurately reflect deletions
        await File.deleteMany({ userId: collaboratorId, projectName });

        // Insert fresh snapshot from owner
        for (const file of ownerFiles) {
            await File.create({
                userId: collaboratorId, 
                projectName, 
                path: file.path,
                content: file.content, 
                isDirectory: file.isDirectory, 
                updatedAt: Date.now()
            });
        }
        res.status(200).json({ msg: 'Pulled from global successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Get all files for a project
app.get('/files/project', async (req, res) => {
    const { userId, projectName } = req.query;
    try {
        const files = await File.find({ userId, projectName });
        res.status(200).json({ files });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});
// ── AI Code Autocomplete Route ────────────────
// Rate limit: 20 requests per minute (Gemini free tier is generous)
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { msg: 'AI rate limit reached. Please wait a moment.' }
});

app.post('/ai/complete', aiLimiter, authMiddleware, async (req, res) => {
    const { code, language, cursorLine } = req.body;
    if (!code) return res.status(400).json({ msg: 'No code provided' });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) return res.status(500).json({ msg: 'AI not configured' });

    const prompt = `You are an expert ${language || 'programming'} code assistant embedded in a VS Code-like editor.

The user is writing ${language || 'code'} and their cursor is at line ${cursorLine || 'the end'}.
Complete the code naturally. Return ONLY the completion text (what comes after the cursor), no explanations, no markdown, no code blocks.
Keep completions concise (1-5 lines max). If nothing useful can be suggested, return an empty string.

CODE SO FAR:
\`\`\`${language || ''}
${code}
\`\`\`

Complete from exactly where the code ends:`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.2,      // Low = more deterministic code
                        maxOutputTokens: 150,  // Keep completions short
                        stopSequences: ['\n\n\n'] // Stop at big blank gaps
                    }
                })
            }
        );

        if (!response.ok) {
            const err = await response.text();
            console.error('Gemini API error:', err);
            return res.status(502).json({ msg: `AI service error: ${err}` });
        }

        const data = await response.json();
        const completion = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.json({ completion: completion.trim() });
    } catch (err) {
        console.error('AI completion error:', err);
        res.status(500).json({ msg: 'Failed to get AI completion' });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
