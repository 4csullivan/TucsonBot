const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

function loadCommands() {
    const root = path.join(__dirname, 'commands');
    const commands = [];
    for (const folder of fs.readdirSync(root).sort()) {
        for (const file of fs.readdirSync(path.join(root, folder)).filter(f => f.endsWith('.js')).sort()) {
            const command = require(path.join(root, folder, file));
            // Legacy deprecated files export an empty object; match the bot loader.
            if (Object.keys(command).length === 0) continue;
            if (!command.data || typeof command.execute !== 'function') throw new Error(`Invalid command: ${folder}/${file}`);
            commands.push(command.data.toJSON());
        }
    }
    if (!commands.length) throw new Error('Refusing to deploy an empty command list.');
    return commands;
}

async function deployCommands({ commands, rest, appId, guildId, stateFile, force = false }) {
    if (!appId) throw new Error('APP_ID is required.');
    const route = guildId ? Routes.applicationGuildCommands(appId, guildId) : Routes.applicationCommands(appId);
    const hash = createHash('sha256').update(JSON.stringify({ route, commands })).digest('hex');
    let previous;
    if (stateFile) {
        try { previous = fs.readFileSync(stateFile, 'utf8').trim(); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (!force && previous === hash) {
        console.log('Command definitions unchanged; skipping registration.');
        return false;
    }
    await rest.put(route, { body: commands });
    if (stateFile) {
        fs.mkdirSync(path.dirname(stateFile), { recursive: true });
        fs.writeFileSync(`${stateFile}.tmp`, hash);
        fs.renameSync(`${stateFile}.tmp`, stateFile);
    }
    console.log(`Registered ${commands.length} commands (${guildId ? 'guild' : 'global'}).`);
    return true;
}

if (require.main === module) {
    Promise.resolve().then(() => {
        if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is required.');
        const scope = process.env.COMMAND_SCOPE || 'guild';
        if (!['guild', 'global'].includes(scope)) throw new Error('COMMAND_SCOPE must be guild or global.');
        const guildId = process.env.COMMAND_GUILD_ID || process.env.TEST_GUILD_ID;
        if (scope === 'guild' && !guildId) throw new Error('COMMAND_GUILD_ID or TEST_GUILD_ID is required for guild scope.');
        return deployCommands({
            commands: loadCommands(),
            rest: new REST().setToken(process.env.DISCORD_TOKEN),
            appId: process.env.APP_ID,
            guildId: scope === 'guild' ? guildId : undefined,
            stateFile: process.env.COMMAND_STATE_FILE,
            force: process.argv.includes('--force'),
        });
    }).catch(error => {
        console.error(`Command deployment failed: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = { loadCommands, deployCommands };
