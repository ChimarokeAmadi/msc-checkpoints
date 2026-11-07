// Connects to MongoDB. Without MONGO_URI (development), a temporary
// in-memory MongoDB is started so the project runs without installing anything.

const mongoose = require('mongoose');
const config = require('./config');

let memoryServer;

async function connectMongo() {
  let uri = config.mongoUri;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    console.log('MONGO_URI not set: starting an in-memory MongoDB...');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('shop');
  }
  await mongoose.connect(uri);
  console.log(`MongoDB connected (database "${mongoose.connection.name}")`);
}

async function disconnectMongo() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

module.exports = { connectMongo, disconnectMongo };
