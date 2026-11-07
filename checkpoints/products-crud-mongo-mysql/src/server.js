// Entry point: connect to BOTH databases, then start the server
// Run with: npm start

const config = require('./config/config');
const { connectMongo, disconnectMongo } = require('./config/mongo');
const { connectMySQL, disconnectMySQL } = require('./config/mysql');
const { createApp } = require('./app');

async function start() {
  await Promise.all([connectMongo(), connectMySQL()]);

  const server = createApp().listen(config.port, () => {
    console.log(`\nServer running at http://localhost:${config.port}`);
    console.log(`  MongoDB products: http://localhost:${config.port}/mongo/products`);
    console.log(`  MySQL products:   http://localhost:${config.port}/sql/products`);
  });

  const shutdown = async () => {
    console.log('\nShutting down...');
    server.close();
    await Promise.allSettled([disconnectMongo(), disconnectMySQL()]);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(async (err) => {
  console.error('Could not start the server:', err.message);
  await Promise.allSettled([disconnectMongo(), disconnectMySQL()]);
  process.exit(1);
});
