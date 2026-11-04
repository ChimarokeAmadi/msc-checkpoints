// ===================== Factory Pattern: notification channels =====================
// createNotificationChannel('console') or ('memory') or ('email', { transport })
// returns an object that implements the NotificationChannel interface.

import { NotificationChannel } from '../interfaces/index.js';
import { ValidationError } from '../utils/errors.js';

/** Prints messages (good for the demo) */
function createConsoleChannel({ output = console } = {}) {
  return {
    name: 'console',
    send(recipient, subject, body) {
      output.log(`  📨 To ${recipient.name} <${recipient.email}> | ${subject}: ${body}`);
    },
  };
}

/** Keeps messages in an array (good for tests) */
function createMemoryChannel() {
  const sent = [];
  return {
    name: 'memory',
    sent,
    send(recipient, subject, body) {
      sent.push({ to: recipient.email, subject, body });
    },
  };
}

/**
 * Sends email through an injected transport (something with sendMail(), like a
 * Nodemailer transporter). The transport is passed in, not created here, so this
 * module doesn't depend on any email library.
 */
function createEmailChannel({ transport, from = 'library@example.com' } = {}) {
  if (!transport || typeof transport.sendMail !== 'function') {
    throw new ValidationError('The email channel needs a transport with a sendMail() method');
  }
  return {
    name: 'email',
    send(recipient, subject, body) {
      return transport.sendMail({ from, to: recipient.email, subject, text: body });
    },
  };
}

const builders = new Map([
  ['console', createConsoleChannel],
  ['memory', createMemoryChannel],
  ['email', createEmailChannel],
]);

export function createNotificationChannel(type, options = {}) {
  const build = builders.get(type);
  if (!build) {
    throw new ValidationError(`Unknown channel "${type}". Known channels: ${[...builders.keys()].join(', ')}`);
  }
  return NotificationChannel.assert(build(options), `${type} channel`);
}

export function registerNotificationChannel(type, builder) {
  builders.set(type, builder);
}
