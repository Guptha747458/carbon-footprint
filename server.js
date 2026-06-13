const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-eco-key-123';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create Tables
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS footprints (
      user_id INTEGER PRIMARY KEY,
      footprint_data TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
  }
});

// Helper function to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// API ROUTES

// 1. Signup
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // In a real app, hash the password using bcrypt here
  const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
  db.run(sql, [name, email, password], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      return res.status(500).json({ error: 'Database error' });
    }
    
    const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ message: 'User created successfully', token, user: { id: this.lastID, name, email } });
  });
});

// 2. Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
  db.get(sql, [email, password], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email } });
  });
});

// 3. Get User Footprint Data
app.get('/api/user/data', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.get('SELECT footprint_data FROM footprints WHERE user_id = ?', [userId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    if (row && row.footprint_data) {
      res.json(JSON.parse(row.footprint_data));
    } else {
      res.json({}); // return empty object if no data exists
    }
  });
});

// 4. Save/Update User Footprint Data
app.post('/api/user/data', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const footprintData = JSON.stringify(req.body);
  
  const sql = `
    INSERT INTO footprints (user_id, footprint_data) 
    VALUES (?, ?) 
    ON CONFLICT(user_id) 
    DO UPDATE SET footprint_data = excluded.footprint_data
  `;
  
  db.run(sql, [userId, footprintData], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error while saving data' });
    }
    res.json({ message: 'Data saved successfully' });
  });
});

// Fallback to index.html for unknown frontend routes (useful for SPA)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
