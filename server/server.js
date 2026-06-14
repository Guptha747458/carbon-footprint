/**
 * EcoStride — Server (MongoDB / Mongoose backend)
 *
 * Endpoints:
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *   GET  /api/user/data
 *   POST /api/user/data
 */
const path       = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') }); // Load .env variables relative to server directory

const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcrypt');
const rateLimit  = require('express-rate-limit');

const User = require('./models/User');

// =============================================================================
// App & Config
// =============================================================================

const app  = express();
const PORT = process.env.PORT || 3000;

// JWT Secret — required; warn loudly in development if missing
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET env variable is not set. Using a temporary random secret.');
  console.warn('    Set JWT_SECRET in your .env file or deployment environment variables.');
}
const ACTIVE_JWT_SECRET = JWT_SECRET || require('crypto').randomBytes(64).toString('hex');

// MongoDB URI — required for any environment
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set. Cannot start server.');
  process.exit(1);
}

// =============================================================================
// Middleware
// =============================================================================

// CORS — restrict to your frontend origin in production
// ALLOWED_ORIGIN can be comma-separated for multiple origins, e.g.:
//   http://localhost:3000,https://guptha747458.github.io
const allowedOrigins = (process.env.ALLOWED_ORIGIN || `http://localhost:${PORT}`).split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps, same-origin)
    if (!origin) return callback(null, true);
    // Allow explicitly listed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any GitHub Pages subdomain (*.github.io)
    if (/^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' is not allowed`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting — brute-force protection on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in 15 minutes.' }
});

// =============================================================================
// Database Connection
// =============================================================================

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      // Recommended options for production reliability
      serverSelectionTimeoutMS: 5000, // fail fast if Atlas is unreachable
      socketTimeoutMS: 45000
    });
    console.log(`✅ Connected to MongoDB (${mongoose.connection.name})`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

// =============================================================================
// Helpers
// =============================================================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, ACTIVE_JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = decoded; // { id, email, iat, exp }
    next();
  });
};

// =============================================================================
// API Routes
// =============================================================================

// ── 1. Signup ─────────────────────────────────────────────────────────────────
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check for duplicate email
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      ACTIVE_JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (err) {
    // Mongoose duplicate key error (race condition fallback)
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

// ── 2. Login ──────────────────────────────────────────────────────────────────
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Constant-time comparison — don't reveal whether email exists
    const hashToCheck = user
      ? user.password
      : '$2b$12$invalidhashfortimingattackpreventiononlynnn';

    const isMatch = await bcrypt.compare(password, hashToCheck);

    if (!user || !isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      ACTIVE_JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

// ── 3. Get User Footprint Data ─────────────────────────────────────────────────
app.get('/api/user/data', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('footprintData');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.footprintData || {});

  } catch (err) {
    console.error('Get data error:', err);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

// ── 4. Save / Update Footprint Data ───────────────────────────────────────────
app.post('/api/user/data', authenticateToken, async (req, res) => {
  try {
    // findByIdAndUpdate with upsert (safe even if document was deleted)
    await User.findByIdAndUpdate(
      req.user.id,
      { $set: { footprintData: req.body } },
      { new: true, runValidators: false }
    );

    res.json({ message: 'Data saved successfully' });

  } catch (err) {
    console.error('Save data error:', err);
    res.status(500).json({ error: 'Error saving data' });
  }
});

// ── 5. Health Check (used by Render and load balancers) ─────────────────────
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  if (dbState === 1) {
    res.json({ status: 'ok', db: 'connected' });
  } else {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// =============================================================================
// Fallback — serve index.html for all unknown routes (SPA support)
// =============================================================================

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =============================================================================
// Start Server (only after DB is connected)
// =============================================================================

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use.`);
      console.error(`   Stop the other process or set a different PORT env variable.\n`);
      process.exit(1);
    }
    throw err;
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed. Goodbye! 🌿');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
});
