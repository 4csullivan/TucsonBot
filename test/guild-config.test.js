const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');
const { GuildConfig } = require('../utils/guild-config');

async function fixture(t, entries) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tucson-config-'));
    const filename = path.join(dir, 'db.sqlite');
    const db = new GuildConfig(await new Promise((resolve, reject) => {
        const connection = new sqlite3.Database(filename, error => error ? reject(error) : resolve(connection));
    }));
    await db.run('CREATE TABLE keyv (key TEXT PRIMARY KEY, value TEXT)');
    for (const [key, value] of entries) await db.run('INSERT INTO keyv VALUES (?, ?)', [key, value]);
    await db.close();
    return filename;
}

test('configuration persists, isolates guilds, validates states and adds roles atomically', async t => {
    const filename = await fixture(t, []);
    let config = await GuildConfig.open(filename);
    assert.equal(await config.getFeature('1', 'repeat_phrase'), 'enabled');
    await config.setFeature('1', 'repeat_phrase', 'limited');
    await assert.rejects(config.setFeature('1', 'repeat_phrase', 'invalid'));
    const results = await Promise.all(Array.from({ length: 20 }, () => config.addRole('1', '10')));
    assert.equal(results.filter(Boolean).length, 1);
    await Promise.all(['11', '12'].map(role => config.addRole('1', role)));
    await config.addRole('2', '20');
    await config.close();
    config = await GuildConfig.open(filename);
    t.after(async () => {
        await config.close();
        await fs.rm(path.dirname(filename), { recursive: true, force: true });
    });
    assert.equal(await config.getFeature('1', 'repeat_phrase'), 'limited');
    assert.equal(await config.getFeature('2', 'repeat_phrase'), 'enabled');
    assert.deepEqual(await config.getRoles('1'), ['10', '11', '12']);
    await config.clearRoles('1');
    assert.deepEqual(await config.getRoles('1'), []);
    assert.deepEqual(await config.getRoles('2'), ['20']);
});

test('imports legacy settings once without reading or changing message arrays', async t => {
    const filename = await fixture(t, [
        ['keyv:guild_1_az_roles', JSON.stringify({ value: ['10', '10', '11'], expires: null })],
        ['keyv:guild_1_config_repeat_phrase', JSON.stringify({ value: 'disabled', expires: null })],
        ['keyv:guild_2_config_repeat_phrase', JSON.stringify({ value: 'disabled', expires: 1 })],
        ['keyv:guild_1_messages', 'not parsed'],
    ]);
    let config = await GuildConfig.open(filename);
    assert.deepEqual(await config.getRoles('1'), ['10', '11']);
    assert.equal(await config.getFeature('1', 'repeat_phrase'), 'disabled');
    assert.equal(await config.getFeature('2', 'repeat_phrase'), 'enabled');
    assert.equal((await config.all('SELECT * FROM keyv')).length, 4);
    await config.clearRoles('1');
    await config.setFeature('1', 'repeat_phrase', 'limited');
    await config.close();
    config = await GuildConfig.open(filename);
    t.after(async () => {
        await config.close();
        await fs.rm(path.dirname(filename), { recursive: true, force: true });
    });
    assert.deepEqual(await config.getRoles('1'), []);
    assert.equal(await config.getFeature('1', 'repeat_phrase'), 'limited');
});

test('malformed legacy configuration rolls back and can be retried', async t => {
    const filename = await fixture(t, [
        ['keyv:guild_1_az_roles', JSON.stringify({ value: ['10'] })],
        ['keyv:guild_1_config_repeat_phrase', JSON.stringify({ value: 'invalid' })],
    ]);
    await assert.rejects(GuildConfig.open(filename), /Invalid legacy feature/);
    const db = new GuildConfig(new sqlite3.Database(filename));
    assert.deepEqual(await db.all("SELECT name FROM sqlite_master WHERE name = 'guild_az_roles'"), []);
    await db.run('UPDATE keyv SET value = ? WHERE key = ?', [JSON.stringify({ value: 'disabled' }), 'keyv:guild_1_config_repeat_phrase']);
    await db.close();
    const config = await GuildConfig.open(filename);
    t.after(async () => {
        await config.close();
        await fs.rm(path.dirname(filename), { recursive: true, force: true });
    });
    assert.deepEqual(await config.getRoles('1'), ['10']);
    assert.equal(await config.getFeature('1', 'repeat_phrase'), 'disabled');
});
