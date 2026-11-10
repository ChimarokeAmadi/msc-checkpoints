// server.js
// The backend of Inkwell, a content management system: an Express API (posts, pages, categories, comments, users) stored
// in MongoDB with Mongoose. In production it also serves the built React app from
// public/, so the whole shop runs as ONE Azure Web App.

const path = require('path');

// Load config/.env when it exists (on my computer). On Azure the variables come
// from the Web App's "Environment variables" settings instead.
require('dotenv').config({ path: path.join(__dirname, 'config', '.env'), quiet: true });

const express = require('express');
const mongoose = require('mongoose');
const { seedIfEmpty } = require('./seed');

const app = express();
app.disable('x-powered-by');
// Azure sits in front of the app, so the visitor's real IP is in X-Forwarded-For
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));

// A few basic security headers
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  next();
});

// ---------------------------------------------------------------------------
// API ROUTES (all under /api, so they never clash with the React pages)
// ---------------------------------------------------------------------------

app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ status: 'ok', database: states[mongoose.connection.readyState] ?? 'unknown' });
});

// If MongoDB isn't connected, answer straight away with 503 instead of hanging
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'The site is starting up or the database is not reachable. Try again in a moment.' });
  }
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/public', require('./routes/public'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api', require('./routes/manage'));

// Unknown API URL -> JSON 404 (not the React page)
app.use('/api', (req, res) => res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` }));

// Errors from any route end up here (Express 5 also catches errors thrown in
// async routes) and become clear HTTP answers
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'The request body is not valid JSON' });
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: errors[0] ?? 'Invalid data', errors });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: `Invalid value for ${err.path}` });
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0];
    const msg = field === 'email' ? 'An account with this email already exists' : field === 'slug' ? 'This name or URL is already used' : 'This already exists';
    return res.status(409).json({ message: msg });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

// ---------------------------------------------------------------------------
// THE REACT APP (built by "npm run build:client" into public/)
// ---------------------------------------------------------------------------
const publicDir = path.join(__dirname, 'public');
// Files in assets/ have a hash in their name (index-Bx4Q.js), so browsers can
// keep them for a long time. index.html must always be checked again, or after
// a new deployment a browser could ask for old asset files that are gone.
app.use(
  express.static(publicDir, {
    setHeaders: (res, file) => {
      if (file.includes(`${path.sep}assets${path.sep}`)) res.set('Cache-Control', 'public, max-age=31536000, immutable');
      else if (file.endsWith('.html')) res.set('Cache-Control', 'no-cache');
      else res.set('Cache-Control', 'public, max-age=3600');
    },
  }),
);

// Any other GET (e.g. refreshing /post/my-post) gets index.html, and React Router takes over
app.get('/{*splat}', (req, res) => res.sendFile(path.join(publicDir, 'index.html'), { headers: { 'Cache-Control': 'no-cache' } }));

// ---------------------------------------------------------------------------
// START
// ---------------------------------------------------------------------------

// Connect to MongoDB (retrying every 10 s), then add the starter products if needed
async function connectWithRetry(uri) {
  for (;;) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      console.log('Connected to MongoDB');
      break;
    } catch (err) {
      console.error('Could not connect to MongoDB:', err.message, '- retrying in 10 s');
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
  try {
    await seedIfEmpty();
  } catch (err) {
    console.error('Could not add the starter content:', err.message);
  }
}

function start() {
  const missing = ['MONGO_URI', 'JWT_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing ${missing.join(' and ')}. Locally: copy config/.env.example to config/.env. On Azure: add them in Environment variables.`);
    process.exit(1);
  }
  const port = process.env.PORT || 3000;
  const server = app.listen(port, () => console.log(`Inkwell CMS running on port ${port}`));
  const ready = connectWithRetry(process.env.MONGO_URI);
  return { server, ready };
}

if (require.main === module) start();

module.exports = { app, start };
