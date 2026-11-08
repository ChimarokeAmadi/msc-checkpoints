// server.js
// The backend of the MERN app: an Express API for users, stored in MongoDB with
// Mongoose. In production it also serves the built React app from public/, so the
// whole app runs as ONE Azure Web App.

const path = require('path');

// Load config/.env when it exists (on my computer). On Azure there is no .env file:
// the variables come from the Web App's "Environment variables" settings instead,
// and dotenv never overwrites variables that are already set.
require('dotenv').config({ path: path.join(__dirname, 'config', '.env'), quiet: true });

const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// API ROUTES (all under /api, so they never clash with the React pages)
// ---------------------------------------------------------------------------

// Health check: a quick way to see if the deployed app reached MongoDB Atlas
app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ status: 'ok', database: states[mongoose.connection.readyState] ?? 'unknown' });
});

// If MongoDB isn't connected (wrong connection string, Atlas IP not allowed...),
// answer straight away with 503 instead of letting the request hang.
app.use('/api/users', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'The database is not connected yet. Check MONGO_URI and the Atlas network access list.' });
  }
  next();
});

const isValidId = (id) => mongoose.isValidObjectId(id);

// Turns Mongoose errors into clear HTTP answers
function sendError(res, err) {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Invalid user', errors });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'A user with this email already exists' });
  }
  console.error(err);
  return res.status(500).json({ message: 'Something went wrong on the server' });
}

// GET /api/users : return all users
app.get('/api/users', async (req, res) => {
  try {
    res.json(await User.find().sort({ createdAt: 1 }));
  } catch (err) {
    sendError(res, err);
  }
});

// POST /api/users : add a new user
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, age } = req.body;
    res.status(201).json(await User.create({ name, email, age }));
  } catch (err) {
    sendError(res, err);
  }
});

// PUT /api/users/:id : edit a user by id
app.put('/api/users/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    const { name, email, age } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, age },
      { returnDocument: 'after', runValidators: true },
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    sendError(res, err);
  }
});

// DELETE /api/users/:id : remove a user by id
app.delete('/api/users/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted', user });
  } catch (err) {
    sendError(res, err);
  }
});

// Unknown API URL -> JSON 404 (not the React page)
app.use('/api', (req, res) => res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` }));

// ---------------------------------------------------------------------------
// THE REACT APP (built by "npm run build:client" into public/)
// ---------------------------------------------------------------------------
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Any other GET (e.g. a page refresh) gets index.html, and React takes over
app.get('/{*splat}', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

// ---------------------------------------------------------------------------
// START
// ---------------------------------------------------------------------------

// Connect to MongoDB, and keep retrying every 10 s if it fails, so a small
// problem (like Atlas not allowing Azure's IP yet) doesn't crash the app.
async function connectWithRetry(uri) {
  for (;;) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      console.log('Connected to MongoDB');
      return;
    } catch (err) {
      console.error('Could not connect to MongoDB:', err.message, '- retrying in 10 s');
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

function start() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing. Locally: copy config/.env.example to config/.env. On Azure: add it in Environment variables.');
    process.exit(1);
  }
  // Azure tells the app which port to use through PORT; 3000 is for my computer
  const port = process.env.PORT || 3000;
  const server = app.listen(port, () => console.log(`Server running on port ${port}`));
  connectWithRetry(uri);
  return server;
}

if (require.main === module) start();

module.exports = { app, start };
