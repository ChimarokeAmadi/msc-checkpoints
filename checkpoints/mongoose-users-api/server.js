// server.js
// A small REST API for users: Express handles the routes, Mongoose talks to MongoDB.

// 1. Load the environment variables from config/.env into process.env
require('dotenv').config({ path: require('path').join(__dirname, 'config', '.env'), quiet: true });

const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();

// Lets Express read JSON request bodies (what Postman sends with "raw → JSON")
app.use(express.json());

// Small helper: is this a valid MongoDB id? (otherwise findById would throw a CastError)
const isValidId = (id) => mongoose.isValidObjectId(id);

// Turns Mongoose errors into clear HTTP answers
function sendError(res, err) {
  if (err.name === 'ValidationError') {
    // e.g. missing name, bad email, negative age -> 400 Bad Request
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Invalid user', errors });
  }
  if (err.code === 11000) {
    // duplicate key from the unique index on email -> 409 Conflict
    return res.status(409).json({ message: 'A user with this email already exists' });
  }
  console.error(err);
  return res.status(500).json({ message: 'Something went wrong on the server' });
}

// ---------------------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------------------

// GET /users : return all users
app.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: 1 }); // oldest first
    res.json(users);
  } catch (err) {
    sendError(res, err);
  }
});

// POST /users : add a new user to the database
app.post('/users', async (req, res) => {
  try {
    const { name, email, age } = req.body; // only take the fields we know
    const user = await User.create({ name, email, age }); // validates, then saves
    res.status(201).json(user); // 201 Created
  } catch (err) {
    sendError(res, err);
  }
});

// PUT /users/:id : edit a user by id
app.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params; // the id comes from the URL, e.g. /users/665f...
    if (!isValidId(id)) return res.status(400).json({ message: 'Invalid user id' });

    const { name, email, age } = req.body;
    const user = await User.findByIdAndUpdate(
      id,
      { name, email, age }, // undefined fields are ignored, so you can send only what changes
      {
        returnDocument: 'after', // send back the user AFTER the update
        runValidators: true, // apply the schema rules to updates too
      },
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    sendError(res, err);
  }
});

// DELETE /users/:id : remove a user by id
app.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: 'Invalid user id' });

    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted', user }); // return the removed user
  } catch (err) {
    sendError(res, err);
  }
});

// Any other URL -> 404
app.use((req, res) => res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` }));

// ---------------------------------------------------------------------------
// START: connect to MongoDB first, then launch the server
// ---------------------------------------------------------------------------
async function start() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing. Copy config/.env.example to config/.env first.');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  }

  const port = process.env.PORT || 3000;
  return app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
}

// Only start when run with "node server.js" (the tests import app without starting it)
if (require.main === module) start();

module.exports = { app, start };
