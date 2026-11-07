// Connects to MongoDB.
// If MONGO_URI is set (e.g. MongoDB Atlas), we use it. If not, in development
// we start a temporary in-memory MongoDB so the API works straight away
// (the data disappears when the server stops).

const mongoose = require('mongoose');
const config = require('./config');

let memoryServer;

async function connectDB() {
  let uri = config.mongoUri;

  if (!uri) {
    if (config.env === 'production') throw new Error('MONGO_URI must be set in production');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    console.log('MONGO_URI not set: starting an in-memory MongoDB (data is lost on restart)...');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('task-manager');
  }

  await mongoose.connect(uri);
  console.log(`MongoDB connected (${mongoose.connection.name})`);
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

module.exports = { connectDB, disconnectDB };
