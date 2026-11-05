// Starts the To-Do API. Run with: node server.js   (or PORT=4000 node server.js)
// Only Node.js core modules are used: no Express, no database.

import http from 'node:http';
import { createApp } from './src/app.js';

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer(createApp());

server.listen(PORT, () => {
  console.log(`To-Do API running at http://localhost:${PORT}/todos`);
});

// Stop cleanly with Ctrl + C
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});
