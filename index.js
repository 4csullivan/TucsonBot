const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { GuildConfig } = require('./utils/guild-config');
const { MessageCorpus } = require('./utils/message-corpus');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

let shuttingDown = false;
async function shutdown(exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    client.destroy();
    const results = await Promise.allSettled([client.config?.close(), client.messageCorpus?.close()]);
    for (const result of results) {
        if (result.status === 'rejected') {
            console.error('Database close failed:', result.reason);
            exitCode = 1;
        }
    }
    process.exit(exitCode);
}
process.once('SIGINT', () => shutdown());
process.once('SIGTERM', () => shutdown());

async function initClient() {
    const dataDir = path.join(__dirname, 'data');
    await fs.promises.mkdir(dataDir, { recursive: true });
    client.config = await GuildConfig.open(path.join(dataDir, 'db.sqlite'));
    client.messageCorpus = await MessageCorpus.open(path.join(dataDir, 'message-corpus.sqlite'));
    // Raw events include IDs even when messages are absent from discord.js's cache.
    client.on(Events.Raw, packet => {
        const data = packet.d;
        let operation;
        if (packet.t === 'MESSAGE_UPDATE') operation = client.messageCorpus.update(data);
        if (packet.t === 'MESSAGE_DELETE') operation = client.messageCorpus.remove(data.guild_id, [data.id]);
        if (packet.t === 'MESSAGE_DELETE_BULK') operation = client.messageCorpus.remove(data.guild_id, data.ids);
        operation?.catch(error => console.error('Message corpus event failed:', error));
    });
    const corpusCleanup = setInterval(() => {
        client.messageCorpus.prune().catch(error => console.error('Message corpus cleanup failed:', error));
    }, 60 * 60 * 1000);
    corpusCleanup.unref();

    // Log in to Discord with your client's token
    await client.login(process.env.DISCORD_TOKEN);
    if (process.env.HEALTH_FILE) {
        const health = setInterval(() => {
            if (client.isReady()) fs.writeFileSync(process.env.HEALTH_FILE, 'ready');
        }, 10_000);
        health.unref();
    }
}

initClient().catch(error => {
    console.error(error);
    return shutdown(1);
});
