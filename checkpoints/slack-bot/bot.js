// Simple Slack bot built with Bolt for JavaScript
// - Replies to the /hello slash command
// - Logs every message posted in the channels it has been added to
//
// Run with: node bot.js

require('dotenv').config({ quiet: true });
const { App, LogLevel } = require('@slack/bolt');

// ---------- Check the tokens before starting ----------

const { SLACK_BOT_TOKEN, SLACK_APP_TOKEN, SLACK_SIGNING_SECRET, PORT = 3000 } = process.env;

// Socket Mode (SLACK_APP_TOKEN set): the bot opens a connection to Slack itself,
// so it works on your own computer without a public URL.
// HTTP mode (no SLACK_APP_TOKEN): Slack sends events to your Request URL,
// which needs the signing secret to verify the requests really come from Slack.
const useSocketMode = Boolean(SLACK_APP_TOKEN);

const missing = [];
if (!SLACK_BOT_TOKEN) missing.push('SLACK_BOT_TOKEN');
if (!useSocketMode && !SLACK_SIGNING_SECRET) missing.push('SLACK_APP_TOKEN (or SLACK_SIGNING_SECRET for HTTP mode)');

if (missing.length > 0) {
  console.error(`Missing in your .env file: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in your tokens (see README.md).');
  process.exit(1);
}

// ---------- Connect to Slack ----------

const app = new App({
  token: SLACK_BOT_TOKEN,
  ...(useSocketMode
    ? { socketMode: true, appToken: SLACK_APP_TOKEN }
    : { signingSecret: SLACK_SIGNING_SECRET }),
  logLevel: LogLevel.INFO,
  // Check the token in app.init() below (instead of here), so a bad token
  // can be caught and reported with a clear message
  deferInitialization: true,
});

// ---------- /hello command ----------

// Slack expects every slash command to be acknowledged within 3 seconds
app.command('/hello', async ({ command, ack, respond }) => {
  await ack();
  await respond({
    response_type: 'in_channel', // visible to everyone in the channel, not just the sender
    text: `Hello, <@${command.user_id}>! 👋 I'm up and running.`,
  });
  console.log(`[command] /hello used by ${command.user_name} in #${command.channel_name}`);
});

// ---------- Log every message ----------

// Formats a Slack timestamp like "1730715600.123456" as a readable date and time
function formatTimestamp(ts) {
  return new Date(Number(ts) * 1000).toLocaleString();
}

app.event('message', async ({ event }) => {
  const time = formatTimestamp(event.ts);

  // Edited and deleted messages arrive as message events with a subtype
  if (event.subtype === 'message_changed') {
    console.log(`[${time}] channel ${event.channel} | message edited: "${event.message?.text ?? ''}"`);
  } else if (event.subtype === 'message_deleted') {
    console.log(`[${time}] channel ${event.channel} | a message was deleted`);
  } else {
    const author = event.user ? `user ${event.user}` : event.bot_id ? `bot ${event.bot_id}` : 'unknown';
    console.log(`[${time}] channel ${event.channel} | ${author}: ${event.text ?? ''}`);
  }
});

// Bonus: also reply when someone just types "hello" in the channel
app.message(/^hello\b/i, async ({ message, say }) => {
  // Ignore messages from bots (including this one's own /hello reply,
  // which also starts with "Hello") so it doesn't answer itself
  if (message.subtype || message.bot_id || !message.user) return;
  await say(`Hey there, <@${message.user}>! Try the /hello command too.`);
});

// ---------- Errors and startup ----------

app.error(async (error) => {
  console.error('Something went wrong:', error.message);
});

(async () => {
  try {
    await app.init();
    await app.start(PORT);
    console.log(
      useSocketMode
        ? '⚡️ Slack bot is running in Socket Mode.'
        : `⚡️ Slack bot is running on port ${PORT}. Request URL path: /slack/events`
    );
  } catch (error) {
    // The most common cause: a wrong or expired token in .env
    const code = error.data?.error || error.message;
    console.error(`Could not connect to Slack: ${code}`);
    if (code === 'invalid_auth' || code === 'not_authed') {
      console.error('Check that the tokens in your .env file are correct and the app is installed to your workspace.');
    }
    process.exit(1);
  }
})();
