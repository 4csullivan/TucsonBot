const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { deployCommands, loadCommands } = require('../deploy-commands');

test('command registration tracks successful definitions and scope, retries failures, and supports force', async t => {
    fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
    const dir = fs.mkdtempSync(path.join(__dirname, '../data/tucson-deploy-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const calls = [];
    const options = {
        commands: [{ name: 'old', description: 'Original' }],
        rest: { put: async (route, body) => calls.push({ route, body }) },
        appId: '123', guildId: '456', stateFile: path.join(dir, 'state'),
    };
    assert.equal(await deployCommands(options), true);
    assert.equal(await deployCommands(options), false);
    assert.equal(calls.length, 1);
    const changed = { ...options, commands: [{ name: 'new', description: 'Renamed' }] };
    const previous = fs.readFileSync(options.stateFile, 'utf8');
    await assert.rejects(deployCommands({ ...changed, rest: { put: async () => { throw new Error('API unavailable'); } } }), /API unavailable/);
    assert.equal(fs.readFileSync(options.stateFile, 'utf8'), previous);
    assert.equal(await deployCommands(changed), true);
    assert.deepEqual(calls.at(-1).body.body, changed.commands);
    assert.equal(await deployCommands(changed), false);
    assert.equal(await deployCommands({ ...changed, force: true }), true);
    assert.equal(await deployCommands({ ...changed, guildId: undefined }), true);
    assert.equal(calls.at(-1).route, '/applications/123/commands');
    assert.equal(await deployCommands({ ...changed, guildId: '789' }), true);
    await assert.rejects(deployCommands({ ...options, appId: undefined }), /APP_ID/);
});

test('all release command definitions load without connecting to Discord', () => {
    const commands = loadCommands();
    assert.ok(commands.length > 0);
    assert.equal(new Set(commands.map(c => c.name)).size, commands.length);
});
