// Settings from environment variables (.env)

try {
  process.loadEnvFile(); // Node 20.12+
} catch {
  // no .env file: defaults below
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI || '',
  mysql: {
    host: process.env.MYSQL_HOST || '',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'shop',
  },
};
