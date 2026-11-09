// Starts a private Redis server and a private MongoDB server for the benchmark,
// so nothing has to be installed on the computer. Both run on this machine,
// which keeps the comparison fair (same CPU, same RAM, no network).

const fs = require('fs');
const os = require('os');
const path = require('path');

// Keep the Redis build inside this project, whatever folder the script is run from
process.env.REDISMS_DOWNLOAD_DIR ??= path.join(__dirname, '..', 'node_modules', '.cache', 'redis-memory-server', 'redis-binaries');

const { RedisMemoryServer } = require('redis-memory-server');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Redis runs as a pure in-memory cache by default here (no snapshots, no
// append-only file); `persistence: true` turns on the AOF log, like a
// production setup that must survive a restart.
async function startRedis({ persistence = false } = {}) {
  // With persistence, the append-only file goes to a temporary folder that is
  // deleted when the server stops (otherwise Redis writes it where it was started)
  const dir = persistence ? fs.mkdtempSync(path.join(os.tmpdir(), 'redis-aof-')) : null;
  const args = persistence ? ['--appendonly', 'yes', '--appendfsync', 'everysec', '--save', '', '--dir', dir] : ['--save', '', '--appendonly', 'no'];
  const server = await RedisMemoryServer.create({ instance: { args } });
  const url = `redis://${await server.getHost()}:${await server.getPort()}`;
  return {
    url,
    stop: async () => {
      await server.stop();
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

// MongoDB uses its normal WiredTiger storage engine (data written to disk,
// compressed), in a temporary folder that is deleted afterwards.
async function startMongo() {
  const server = await MongoMemoryServer.create({ instance: { storageEngine: 'wiredTiger', args: ['--setParameter', 'indexBuildMinAvailableDiskSpaceMB=100'] } });
  return { uri: server.getUri(), stop: () => server.stop() };
}

module.exports = { startRedis, startMongo };
