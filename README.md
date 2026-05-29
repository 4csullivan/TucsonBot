# TucsonBot

TucsonBot is a small Discord bot written in Node.js using discord.js and Keyv (sqlite) for lightweight per-guild configuration. It provides fun utilities related to the city of Tucson. Features can be enabled, disabled, or limited to specific roles per guild.

# Features

- Correct misspellings of Tucson and respond with some fun facts
- React to messages referencing TucsonBot
- Respond to questions directed towards TucsonBot, giving an 'eight ball' like response
- Repeat specific phrases when asked

# Prerequisites
- Node.js 20+ (the project Dockerfile uses node:20-alpine)
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
node deploy-commands.js
```

## Docker

Build image and run with Docker compose:

```
docker compose build --no-cache
docker run compose up -d
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


Notes

- Do not commit your bot token or private keys. .env is listed in .gitignore.
- The repository includes asset files used for replies (assets/*.json). Use these files for updating what the bot says.

License

This project is licensed under the MIT License. See LICENSE for details.
