const sqlite3 = require('sqlite3');

const FEATURES = ['misspelling_corrections', 'message_reactions', 'mention_response', 'repeat_phrase'];
const STATES = ['enabled', 'disabled', 'limited'];

class GuildConfig {
    constructor(db) { this.db = db; }

    run(sql, params = []) {
        return new Promise((resolve, reject) => this.db.run(sql, params, function(error) {
            if (error) reject(error);
            else resolve(this.changes);
        }));
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => this.db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
    }

    static async open(filename) {
        const db = await new Promise((resolve, reject) => {
            const connection = new sqlite3.Database(filename, error => error ? reject(error) : resolve(connection));
        });
        const config = new GuildConfig(db);
        try {
            await config.run('PRAGMA busy_timeout = 5000');
            await config.run('BEGIN IMMEDIATE');
            await config.run(`CREATE TABLE IF NOT EXISTS guild_features (
                guild_id TEXT NOT NULL, feature TEXT NOT NULL CHECK(feature IN ('misspelling_corrections', 'message_reactions', 'mention_response', 'repeat_phrase')),
                state TEXT NOT NULL CHECK(state IN ('enabled', 'disabled', 'limited')),
                PRIMARY KEY (guild_id, feature)
            )`);
            await config.run(`CREATE TABLE IF NOT EXISTS guild_az_roles (
                guild_id TEXT NOT NULL, role_id TEXT NOT NULL, PRIMARY KEY (guild_id, role_id)
            )`);
            await config.run('CREATE TABLE IF NOT EXISTS config_migrations (name TEXT PRIMARY KEY)');
            if (!(await config.all("SELECT name FROM config_migrations WHERE name = 'keyv-v1'")).length) {
                await config.migrateKeyv();
                await config.run("INSERT INTO config_migrations VALUES ('keyv-v1')");
            }
            await config.run('COMMIT');
            return config;
        } catch (error) {
            await config.run('ROLLBACK').catch(() => {});
            await config.close();
            throw error;
        }
    }

    async migrateKeyv() {
        if (!(await this.all("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'keyv'")).length) return;
        // Select only configuration; legacy message arrays can be large and stay untouched.
        const rows = await this.all(`SELECT key, value FROM keyv
            WHERE key GLOB 'keyv:guild_*_az_roles' OR key GLOB 'keyv:guild_*_config_*'
               OR key GLOB 'guild_*_az_roles' OR key GLOB 'guild_*_config_*'`);
        for (const row of rows) {
            const match = /^(?:keyv:)?guild_(\d+)_(az_roles|config_(.+))$/.exec(row.key);
            if (!match || (match[3] && !FEATURES.includes(match[3]))) continue;
            const entry = JSON.parse(row.value);
            if (entry.expires && entry.expires <= Date.now()) continue;
            if (match[2] === 'az_roles') {
                if (!Array.isArray(entry.value) || entry.value.some(id => typeof id !== 'string' || !/^\d+$/.test(id))) {
                    throw new Error(`Invalid legacy roles for guild ${match[1]}`);
                }
                for (const role of entry.value) await this.addRole(match[1], role);
            } else {
                if (!STATES.includes(entry.value)) throw new Error(`Invalid legacy feature for guild ${match[1]}`);
                await this.run('INSERT OR IGNORE INTO guild_features VALUES (?, ?, ?)', [match[1], match[3], entry.value]);
            }
        }
    }

    async getFeature(guildId, feature) {
        const rows = await this.all('SELECT state FROM guild_features WHERE guild_id = ? AND feature = ?', [guildId, feature]);
        return rows[0]?.state ?? 'enabled';
    }

    async setFeature(guildId, feature, state) {
        if (!FEATURES.includes(feature) || !STATES.includes(state)) throw new Error('Invalid feature or state');
        await this.run(`INSERT INTO guild_features VALUES (?, ?, ?)
            ON CONFLICT(guild_id, feature) DO UPDATE SET state = excluded.state`, [guildId, feature, state]);
    }

    async getRoles(guildId) {
        return (await this.all('SELECT role_id FROM guild_az_roles WHERE guild_id = ? ORDER BY role_id', [guildId])).map(row => row.role_id);
    }

    async addRole(guildId, roleId) {
        return (await this.run('INSERT OR IGNORE INTO guild_az_roles VALUES (?, ?)', [guildId, roleId])) > 0;
    }

    async clearRoles(guildId) {
        await this.run('DELETE FROM guild_az_roles WHERE guild_id = ?', [guildId]);
    }

    close() {
        return new Promise((resolve, reject) => this.db.close(error => error ? reject(error) : resolve()));
    }
}

module.exports = { GuildConfig };
