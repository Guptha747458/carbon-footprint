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
    // Allow any Vercel deployment (*.vercel.app) — covers preview & production URLs
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
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

// ── 4.5. AI Assistant Chat Proxy ──────────────────────────────────────────────
app.post('/api/assistant/chat', authLimiter, async (req, res) => {
  try {
    const { message, history, userContext, clientApiKey } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({ apiKeyMissing: true });
    }

    // Prepare system instruction text
    const targetSavings = userContext.baseline * (userContext.goalPercent / 100);
    const targetLimit = userContext.baseline - targetSavings;
    const systemPrompt = `You are "Eco-Coach", the smart, friendly, and expert AI Sustainability & Climate Coach for the EcoStride app.
Your goal is to help the user understand and reduce their carbon footprint in an engaging, gamified way.

USER CONTEXT:
- Name: ${userContext.name || "Eco-Hero"}
- Level: ${userContext.level || 1}
- XP: ${userContext.xp || 0}
- Habit Streak: ${userContext.streak || 0} days
- Baseline Carbon Footprint: ${userContext.baseline || 0} metric tons CO2e/year
- Target Goal: -${userContext.goalPercent || 20}% reduction (Target Limit: ${targetLimit.toFixed(2)} tons/year, Savings: ${targetSavings.toFixed(2)} tons/year)
- Annual breakdown:
  * Transportation: ${userContext.breakdown?.transport || 0} tons
  * Home Energy: ${userContext.breakdown?.energy || 0} tons
  * Diet & Waste: ${userContext.breakdown?.diet || 0} tons

LIFESTYLE DETAILS:
- Car Type: ${userContext.calculatorInputs?.carType || "none"}
- Weekly driving: ${userContext.calculatorInputs?.carDist || 0} km
- Weekly public transit: ${userContext.calculatorInputs?.transitDist || 0} km
- Annual short-haul flights: ${userContext.calculatorInputs?.flightsShort || 0}
- Annual long-haul flights: ${userContext.calculatorInputs?.flightsLong || 0}
- Monthly electricity: ${userContext.calculatorInputs?.electricityBill || 0} kWh
- Monthly gas: ${userContext.calculatorInputs?.gasBill || 0} therms
- Household size: ${userContext.calculatorInputs?.householdSize || 1}
- Diet: ${userContext.calculatorInputs?.dietType || "average"}
- Weekly waste: ${userContext.calculatorInputs?.wasteProduced || 0} kg
- Recycles: ${userContext.calculatorInputs?.recycleActive ? "Yes" : "No"}

USER ACTION HISTORY (recently logged):
${JSON.stringify(userContext.history?.slice(-5) || [])}

AVAILABLE ACTIONS TO LOG:
Here are the eco-actions the user can check off to save carbon and earn XP:
- "bike_short" (Bike or Walk instead of driving): saves 1.5 kg CO2, +40 XP
- "public_transit" (Commute via transit): saves 3.2 kg CO2, +50 XP
- "carpool" (Share a ride): saves 2.5 kg CO2, +35 XP
- "eco_driving" (Practice eco-driving): saves 0.8 kg CO2, +20 XP
- "thermostat_tweak" (Thermostat optimization): saves 1.8 kg CO2, +30 XP
- "cold_wash" (Wash laundry in cold water): saves 0.6 kg CO2, +20 XP
- "air_dry" (Line dry clothes): saves 1.8 kg CO2, +35 XP
- "unplug_standby" (Slay vampire power): saves 0.4 kg CO2, +15 XP
- "led_upgrade" (Install LED bulbs - one-time): saves 75.0 kg CO2, +150 XP
- "meatless_day" (Plant-based meatless day): saves 4.2 kg CO2, +60 XP
- "prevent_food_waste" (Zero waste meal): saves 1.2 kg CO2, +30 XP
- "compost_waste" (Compost organic material): saves 0.6 kg CO2, +20 XP
- "local_organic" (Support local produce): saves 1.0 kg CO2, +25 XP
- "reusable_bottles" (Go single-use free): saves 0.3 kg CO2, +15 XP

SPECIAL CAPABILITIES:
1. If the user tells you they performed one of these actions (e.g. "I rode my bike today" or "I just washed my clothes in cold water"), confirm it in a warm, encouraging way. At the end of your response, you MUST append a JSON block inside triple colons like this to automatically log it in the app:
   :::action
   {"type": "LOG_ACTION", "actionId": "bike_short"}
   :::
   Only trigger this if they explicitly mention having done it. Do NOT repeat or include this block unless executing the action.

2. If the user asks "What if I reduce my driving to 50 km/week?" or asks you to simulate a lifestyle change, you can tell them the impact. If they want to test or apply a simulated value, you can also return:
   :::action
   {"type": "SIMULATE", "changes": {"driving": 50}}
   :::
   Supported simulation sliders: "driving" (km/week), "electricity" (kWh/month), "flightsShort" (annual short flights), "dietIndex" (0=vegan, 1=vegetarian, 2=flexitarian, 3=average, 4=meat-heavy).

Keep your responses brief, informative, and encouraging. Never make up actions or IDs not listed above. Do not output the action JSON block unless the user has explicitly confirmed they performed the action or wants to run the simulation.`;

    // Map conversation history to Gemini parts format
    const contents = [];
    if (history && history.length > 0) {
      history.forEach(item => {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.text }]
        });
      });
    }

    // Add the current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const payload = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const resultData = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error details:', JSON.stringify(resultData));
      return res.status(response.status).json({
        error: resultData.error?.message || 'Error communicating with Gemini AI API'
      });
    }

    // Extract the text content from Gemini's response structure
    const replyText = resultData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    res.json({ reply: replyText });

  } catch (err) {
    console.error('Assistant API error:', err);
    res.status(500).json({ error: 'An unexpected error occurred in the assistant API.' });
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
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      res.status(404).send("Frontend assets not built. Please run 'npm run build' inside the client folder.");
    }
  });
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
