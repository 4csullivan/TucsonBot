const sqlite3 = require('sqlite3');

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_PER_USER = 5000;

function normalizeContent(content) {
    if (typeof content !== 'string') return null;
    // Keep punctuation/case for later tokenization; exclude non-prose and pings.
    if (/(https?:\/\/|www\.|<[@#][^>]*>|<a?:\w+:\d+>|@everyone\b|@here\b|```|\|\|)/iu.test(content)) return null;
    const text = content.replace(/\s+/gu, ' ').trim();
    const wordCount = text ? text.split(' ').length : 0;
    if (wordCount < 2 || wordCount > 200 || text.length > 2000 || !/\p{L}/u.test(text)) return null;
    return { content: text, wordCount };
}

class MessageCorpus {
    constructor(db, now = Date.now) {
        this.db = db;
        this.now = now;
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => this.db.run(sql, params, error => error ? reject(error) : resolve()));
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => this.db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
    }

    static async open(filename, now) {
        const db = await new Promise((resolve, reject) => {
            const connection = new sqlite3.Database(filename, error => error ? reject(error) : resolve(connection));
        });
        const corpus = new MessageCorpus(db, now);
        try {
            await corpus.run('PRAGMA busy_timeout = 5000');
            await corpus.run(`CREATE TABLE IF NOT EXISTS messages (
                message_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL,
                author_id TEXT NOT NULL, content TEXT NOT NULL, word_count INTEGER NOT NULL,
                created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
            )`);
            await corpus.run('CREATE INDEX IF NOT EXISTS messages_author ON messages(guild_id, author_id, created_at)');
            await corpus.run('CREATE INDEX IF NOT EXISTS messages_source ON messages(guild_id, channel_id, author_id, word_count)');
            await corpus.run('CREATE INDEX IF NOT EXISTS messages_age ON messages(created_at)');
            await corpus.prune();
            return corpus;
        } catch (error) {
            await corpus.close();
            throw error;
        }
    }

    async record(message) {
        if (!message.guildId || !message.author || message.author.bot || message.webhookId || message.system) return;
        const normalized = normalizeContent(message.content);
        if (!normalized || message.createdTimestamp < this.now() - RETENTION_MS) return;
        // A single INSERT avoids the old read/modify/write race; IDs deduplicate deliveries.
        await this.run(`INSERT OR IGNORE INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            message.id, message.guildId, message.channelId, message.author.id,
            normalized.content, normalized.wordCount, message.createdTimestamp, this.now(),
        ]);
        await this.run(`DELETE FROM messages WHERE guild_id = ? AND author_id = ? AND message_id NOT IN
            (SELECT message_id FROM messages WHERE guild_id = ? AND author_id = ? ORDER BY created_at DESC, message_id DESC LIMIT ?)`,
        [message.guildId, message.author.id, message.guildId, message.author.id, MAX_PER_USER]);
    }

    async update(data) {
        if (!data.guild_id || typeof data.content !== 'string') return;
        const normalized = normalizeContent(data.content);
        if (!normalized) return this.remove(data.guild_id, [data.id]);
        // Only update already-collected messages; embed-only updates don't erase text.
        await this.run(`UPDATE messages SET content = ?, word_count = ?, updated_at = ?
            WHERE guild_id = ? AND message_id = ?`,
        [normalized.content, normalized.wordCount, this.now(), data.guild_id, data.id]);
    }

    async remove(guildId, ids) {
        if (!guildId || !ids.length) return;
        for (let offset = 0; offset < ids.length; offset += 100) {
            const batch = ids.slice(offset, offset + 100);
            await this.run(`DELETE FROM messages WHERE guild_id = ? AND message_id IN (${batch.map(() => '?').join(',')})`, [guildId, ...batch]);
        }
    }

    async quotes(guildId, channelId, authorId) {
        const rows = await this.all(`SELECT DISTINCT content FROM messages
            WHERE guild_id = ? AND channel_id = ? AND author_id = ? AND word_count BETWEEN 4 AND 16 AND created_at >= ?`,
        [guildId, channelId, authorId, this.now() - RETENTION_MS]);
        return rows.map(row => row.content);
    }

    async findQuote(guildId, channelId, phrase) {
        // Literal substring matching: %, _ and quotes are text, never SQL syntax.
        const rows = await this.all(`SELECT content, author_id AS authorId FROM messages
            WHERE guild_id = ? AND channel_id = ? AND word_count BETWEEN 4 AND 16 AND created_at >= ?
            AND instr(lower(content), lower(?)) > 0
            GROUP BY author_id, content ORDER BY random() LIMIT 1`,
        [guildId, channelId, this.now() - RETENTION_MS, phrase]);
        return rows[0] || null;
    }

    async randomQuote(guildId, channelId, authorId = null) {
        const cutoff = this.now() - RETENTION_MS;
        // Choose an author first so prolific posters don't dominate random-person mode.
        if (authorId === null) {
            const authors = await this.all(`SELECT DISTINCT author_id FROM messages
                WHERE guild_id = ? AND channel_id = ? AND word_count BETWEEN 4 AND 16 AND created_at >= ?
                ORDER BY random() LIMIT 1`, [guildId, channelId, cutoff]);
            if (!authors.length) return null;
            authorId = authors[0].author_id;
        }
        const rows = await this.all(`SELECT content, author_id AS authorId FROM messages
            WHERE guild_id = ? AND channel_id = ? AND author_id = ? AND word_count BETWEEN 4 AND 16 AND created_at >= ?
            GROUP BY content ORDER BY random() LIMIT 1`, [guildId, channelId, authorId, cutoff]);
        return rows[0] || null;
    }

    async prune() {
        await this.run('DELETE FROM messages WHERE created_at < ?', [this.now() - RETENTION_MS]);
    }

    close() {
        return new Promise((resolve, reject) => this.db.close(error => error ? reject(error) : resolve()));
    }
}

module.exports = { MessageCorpus, normalizeContent, RETENTION_MS, MAX_PER_USER };
