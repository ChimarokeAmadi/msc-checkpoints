// local.js
// Try the whole shop without installing MongoDB or making a .env file:
// starts a temporary in-memory MongoDB, then starts server.js as usual.
// Everything disappears when you stop it (Ctrl+C).
//
// To get the Admin page locally, register an account with admin@kora.test
// (any password of 8+ characters).

const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('ecommerce');
  process.env.JWT_SECRET ??= 'local-only-secret-not-for-production';
  process.env.ADMIN_EMAIL ??= 'admin@kora.test';
  console.log('Started a temporary in-memory MongoDB');
  console.log(`Register with ${process.env.ADMIN_EMAIL} to get the Admin page`);

  const { start } = require('./server');
  await start().ready;

  process.on('SIGINT', async () => {
    await require('mongoose').disconnect();
    await mongod.stop();
    process.exit(0);
  });
})();
