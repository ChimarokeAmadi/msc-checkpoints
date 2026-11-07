// All settings come from environment variables (.env), with safe defaults for development.

const crypto = require('crypto');

try {
  process.loadEnvFile(); // Node 20.12+: reads .env if it exists
} catch {
  // no .env file: use the defaults below
}

const env = process.env.NODE_ENV || 'development';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (env === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  // Development only: a random secret for this run (everyone gets logged out on restart)
  jwtSecret = crypto.randomBytes(32).toString('hex');
  if (env !== 'test') console.warn('⚠️  JWT_SECRET is not set, using a random one for this run (see .env.example)');
}

const days = Number(process.env.JWT_EXPIRES_IN_DAYS) || 1;

module.exports = {
  env,
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret,
  jwtExpiresIn: `${days}d`,
  cookieMaxAgeMs: days * 24 * 60 * 60 * 1000,
  cookieSecure: process.env.COOKIE_SECURE !== 'false',
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
  },
};
