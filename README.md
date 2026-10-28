# TucsonBot

TucsonBot is a small Discord bot written in Node.js using discord.js and Keyv (sqlite) for lightweight per-guild configuration. It provides fun utilities related to the city of Tucson. Features can be enabled, disabled, or limited to specific roles per guild.

# Features

- Correct misspellings of Tucson and respond with some fun facts
- React to messages referencing TucsonBot
- Respond to questions directed towards TucsonBot, giving an 'eight ball' like response
- Repeat specific phrases when asked

# Prerequisites
- Node.js 22+ (the project Dockerfile uses node:22-alpine)
- npm
- Docker (if deploying to a container)

# Quick start

1. Clone the repository and install dependencies:
```
git clone https://github.com/4csullivan/TucsonBot
cd TucsonBot
npm ci
```

2. Create a .env in the project root with the following variables (replace the placeholders):
```
APP_ID=YOUR_APPLICATION_ID
DISCORD_TOKEN=YOUR_BOT_TOKEN
PUBLIC_KEY=YOUR_PUBLIC_KEY
TEST_GUILD_ID=YOUR_TEST_GUILD_ID
```

3. Create the data directory (Keyv sqlite DB is stored here):

```
mkdir -p data
```

4. Run the bot:
```
node index.js
```

## Register and deploy slash commands

Before using the slash commands you can deploy them to your test guild (or globally). With your .env set, run:

```
node --env-file=.env deploy-commands.js
```

## Docker

For automated GitHub Release deployments to Hetzner, see [release setup](docs/releases.md).

Build image and run with Docker compose:

```
docker compose build --no-cache
docker compose up -d
```

# Configuration & persistence

- The bot uses Keyv backed by sqlite. The default DB file is ./data/db.sqlite.
- Per-guild configuration keys are stored as:
  - guild_<GUILD_ID>_az_roles — array of role IDs allowed for AZ-only features
  - guild_<GUILD_ID>_config_<feature> — values: "enabled", "disabled", "limited"

# Available slash commands (examples)

- /addrole <role> — Add an AZ role for interactions
- /clearroles — Clear all AZ roles for the guild
- /checkroles — List configured AZ roles
- /editfeature <feature> <enable|disable|limit> — Configure a feature for the guild
- /checkfeature <feature> — Show current setting for a feature
- /genius — Create a quote image from one of your saved messages in the current channel, with your server avatar, display name, and server name
- /genius phrase:the goat — Pick a random matching short quote from anyone in the current channel, using the original author's display name and avatar. Enter the phrase without surrounding quotation marks. Matching uses a literal substring and ignores ASCII letter case; no matches produces a message instead of an image.

- /inspire — Use one of your own saved quotes with the original random background, centered white serif text, outline/shadow, and author name
- /inspire source:random — Choose a random author with eligible quotes in the current channel, then a random quote by that author

Both image commands require the bot's Attach Files permission. `/inspire` defaults to your own quotes; each eligible author has an equal chance in random-person mode. Both use the current channel's corpus and 4–16-word quotes. With no own quotes, a placeholder is used; random-person mode reports when the channel has no quotes. Re-register commands with `node deploy-commands.js` (with environment variables loaded) and restart the bot after changing command definitions.

## Quote corpus

Message text lives in `data/message-corpus.sqlite`; Keyv remains responsible for configuration. Each message has its own row with message, guild, channel and author IDs, original creation time, last collection/update time, normalized content and word count. Inserts are parameterized and deduplicated by message ID, so concurrent events cannot overwrite another message's history.

- Collects human server messages independently of response/reaction settings. Skips bots, webhooks, system messages, links, mentions, custom emoji, code blocks and spoilers. Message Content intent must be enabled in the Developer Portal.
- Keeps 2–200 words and at most 2,000 characters. Preserves case and punctuation, normalizing whitespace. `/genius` selects distinct 4–16-word messages by the invoking author in the current channel.
- Retains at most 5,000 messages per author per guild for 90 days. Expired messages are excluded immediately from quote queries and removed on startup and hourly.
- Observed edits update existing rows; edits to excluded content remove them. Single and bulk deletions remove rows using raw Gateway events, including uncached messages. Events missed while the bot is offline cannot be reconciled automatically; retention limits their lifetime.
- Existing Keyv message arrays are left untouched but no longer read or appended to. They lack source message/channel IDs and timestamps, so they cannot be safely imported into the channel-scoped corpus. New quotes accumulate after restart. Those old arrays are not covered by the new retention cleanup.

For a future Markov generator, read a bounded corpus scoped to the intended guild/channel/author, tokenize at generation or training time, and add explicit start/end tokens for each message. Preserve message boundaries to avoid learning transitions between unrelated messages. Keep the source rows authoritative so models can be rebuilt after edits, deletions or expiry. Synthetic output should be labeled as generated rather than attributed as a real quote. No Markov model is implemented yet.

Run `npm test` for the corpus and image-command tests.


Notes

- Do not commit your bot token or private keys. .env is listed in .gitignore.
- The repository includes asset files used for replies (assets/*.json). Use these files for updating what the bot says.

License

This project is licensed under the MIT License. See LICENSE for details.
