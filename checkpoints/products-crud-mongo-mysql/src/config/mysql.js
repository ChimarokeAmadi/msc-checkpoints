// Connects to MySQL with a mysql2 connection pool and creates the products table.
// Without MYSQL_HOST (development), a temporary MySQL server is started with
// mysql-memory-server (the first time, it downloads MySQL, which takes a minute or two).

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('./config');

let pool;
let memoryServer;

async function createTables() {
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'sql', 'schema.sql'), 'utf8');
  // Remove "-- comments", then run each statement
  const statements = sql
    .replace(/--.*$/gm, '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function connectMySQL() {
  let settings = { ...config.mysql };

  if (!settings.host) {
    const { createDB } = require('mysql-memory-server');
    console.log('MYSQL_HOST not set: starting a temporary MySQL server (first run downloads MySQL)...');
    memoryServer = await createDB({ dbName: settings.database, logLevel: 'ERROR' });
    settings = { host: '127.0.0.1', port: memoryServer.port, user: memoryServer.username, password: '', database: memoryServer.dbName };
  }

  pool = mysql.createPool({
    ...settings,
    connectionLimit: 10,
    decimalNumbers: true, // return DECIMAL as a JS number instead of a string
  });
  await pool.query('SELECT 1'); // fail early if the connection settings are wrong
  await createTables();
  console.log(`MySQL connected (database "${settings.database}")`);
}

function getPool() {
  if (!pool) throw new Error('MySQL is not connected yet (call connectMySQL first)');
  return pool;
}

async function disconnectMySQL() {
  if (pool) await pool.end();
  pool = undefined;
  if (memoryServer) await memoryServer.stop();
}

module.exports = { connectMySQL, disconnectMySQL, getPool };
