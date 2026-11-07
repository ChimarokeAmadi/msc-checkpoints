// Starts a temporary MySQL server (mysql-memory-server) and opens connections.
// Each connection = one "user" running its own transaction.

const mysql = require('mysql2/promise');
const { createDB } = require('mysql-memory-server');

async function startMySQL() {
  const server = await createDB({ logLevel: 'ERROR', dbName: 'bank' });
  const settings = { host: '127.0.0.1', port: server.port, user: server.username, database: server.dbName, decimalNumbers: true };
  const connections = [];

  return {
    settings,
    async connect(database = settings.database) {
      const conn = await mysql.createConnection({ ...settings, database });
      connections.push(conn);
      return conn;
    },
    async stop() {
      await Promise.allSettled(connections.map((c) => c.end()));
      await server.stop();
    },
  };
}

module.exports = { startMySQL };
