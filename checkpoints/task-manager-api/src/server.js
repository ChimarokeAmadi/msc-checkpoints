// Entry point: connect to the database, then start listening
// Run with: npm start

const config = require('./config/config');
const { connectDB, disconnectDB } = require('./config/db');
const { createApp } = require('./app');
const { googleEnabled } = require('./config/passport');

async function start() {
  await connectDB();
  const server = createApp().listen(config.port, () => {
    console.log(`Task Manager API running at http://localhost:${config.port}`);
    console.log(`Google login: ${googleEnabled ? 'enabled' : 'disabled (set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)'}`);
  });

  // Close cleanly on Ctrl + C
  const shutdown = async () => {
    console.log('\nShutting down...');
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Errors outside of Express (e.g. the database won't connect)
process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled rejection:', err.message);
  process.exit(1);
});

start().catch((err) => {
  console.error('💥 Could not start the server:', err.message);
  process.exit(1);
});
