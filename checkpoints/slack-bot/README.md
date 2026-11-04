# Slack Bot

This is a simple Slack bot I built with Node.js and Bolt, Slack's official framework. It replies when someone uses the `/hello` command, and it logs every message posted in the channels it's been added to. As a small extra, it also says hi back when someone types "hello" in the channel.

## Setting up the Slack app

The bot runs in Socket Mode. That means it connects to Slack by itself, so it works from your own computer without needing a public URL or a tool like ngrok. The events still come from the Events API; they just arrive over that connection instead of an HTTP request.

1. Go to https://api.slack.com/apps, click **Create New App**, choose **From scratch**, give it a name and pick your workspace.
2. Under **Socket Mode**, turn it on. Slack asks you to create an app-level token: give it the `connections:write` scope and save the token. It starts with `xapp-`.
3. Under **OAuth & Permissions**, in **Bot Token Scopes**, add `chat:write` and `channels:history`.
4. Under **Event Subscriptions**, turn events on, and under **Subscribe to bot events** add `message.channels`. This is the event for messages in public channels.
5. Under **Slash Commands**, click **Create New Command** and make one called `/hello` with a short description. This also adds the `commands` scope automatically.
6. Under **Install App**, install it to your workspace. Then copy the **Bot User OAuth Token**, which starts with `xoxb-`.
7. In Slack, go to the channel you want the bot in and type `/invite @YourBotName`. The bot can only read messages in channels it's been invited to.

If you add a scope later, Slack asks you to reinstall the app before the change takes effect.

There's also a shortcut. When you create the app, you can choose **Paste a manifest** and paste in the contents of `manifest.json` from this folder. That sets up Socket Mode, the scopes, the event and the `/hello` command all at once. After that you still need to create the `xapp-` token under **Basic Information → App-Level Tokens** (with the `connections:write` scope), install the app, and invite the bot to your channel.

## Running the bot

You need Node.js 20 or newer. In this folder, install the packages and create your `.env` file:

```bash
npm install
cp .env.example .env
```

Open `.env` and paste in your two tokens: `SLACK_BOT_TOKEN` (the `xoxb-` one) and `SLACK_APP_TOKEN` (the `xapp-` one). Then start the bot:

```bash
node bot.js
```

When it connects, it prints "Slack bot is running in Socket Mode." Every message posted in the channel then shows up in the terminal with the time, the channel ID and who sent it. Edited and deleted messages are logged too. Type `/hello` in Slack and the bot replies to you in the channel. Press `Ctrl + C` to stop it.

If a token is missing, the bot tells you which one before it even tries to connect. If a token is wrong, it says it couldn't connect and to check your `.env` file.

## Using HTTP mode instead

If you'd rather not use Socket Mode, leave `SLACK_APP_TOKEN` out of `.env` and add `SLACK_SIGNING_SECRET` instead (it's under **Basic Information**). The bot then listens on port 3000. You'd need to make it reachable from the internet, for example with ngrok, and set the Request URL for both Event Subscriptions and the `/hello` command to `https://your-url/slack/events`.

## Keeping tokens safe

The tokens give full access to your bot, so they live in `.env`, which is listed in `.gitignore` and never gets committed. If one ever gets shared by accident, regenerate it from the Slack app settings.
