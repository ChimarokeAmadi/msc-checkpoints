// local.js
// For trying the API without installing MongoDB: starts a temporary MongoDB
// in memory, points MONGO_URI at it, then starts server.js as usual.
// The data disappears when you stop the server (Ctrl+C).

const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('users_api');
  console.log('Started a temporary in-memory MongoDB');

  const { start } = require('./server');
  await start();

  process.on('SIGINT', async () => {
    await require('mongoose').disconnect();
    await mongod.stop();
    process.exit(0);
  });
})();
