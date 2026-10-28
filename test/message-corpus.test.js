const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Collection } = require('discord.js');
const { MessageCorpus, normalizeContent, RETENTION_MS } = require('../utils/message-corpus');

const now = 1800000000000;
function message(id, content = 'This is my genius moment', overrides = {}) {
    return { id, guildId: 'guild', channelId: 'channel', author: { id: 'user', bot: false }, createdTimestamp: now, content, ...overrides };
}

test('normalizes prose while retaining punctuation, case, and sentence boundaries', () => {
    assert.deepEqual(normalizeContent('  Hello,   Tucson!\nHow are you? '), { content: 'Hello, Tucson! How are you?', wordCount: 5 });
    assert.ok(normalizeContent('🌵 Tucson is beautiful today'));
    assert.ok(normalizeContent('word '.repeat(100)));
    for (const text of ['', 'hello', '123 456', 'go https://example.com now', 'hi <@123> friend',
        'hey <@&123> there', 'visit <#123> today', 'look <a:dance:123> here', 'hey @everyone hello',
        'my ||secret words|| here', 'a ```code block``` here', 'word '.repeat(201), 'a'.repeat(2000) + ' b']) {
        assert.equal(normalizeContent(text), null, text);
    }
});

test('caps each author independently and keeps the newest messages', async t => {
    const corpus = await MessageCorpus.open(':memory:', () => now);
    t.after(() => corpus.close());
    await corpus.run(`WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM numbers WHERE n < 5000)
        INSERT INTO messages SELECT CAST(n AS TEXT), 'guild', 'channel', 'user', 'This is a saved quote', 5, ?, ? FROM numbers`, [now - 1, now - 1]);
    await corpus.record(message('new'));
    await corpus.record(message('other', undefined, { author: { id: 'other', bot: false } }));
    assert.equal((await corpus.all("SELECT * FROM messages WHERE author_id = 'user'")).length, 5000);
    assert.equal((await corpus.all("SELECT * FROM messages WHERE message_id = 'new'")).length, 1);
    assert.equal((await corpus.all("SELECT * FROM messages WHERE author_id = 'other'")).length, 1);
});

test('collection runs before a disabled response branch returns', async () => {
    const event = require('../events/messageCreate');
    const calls = [];
    await event.execute({
        ...message('1', 'tucsonbot how are you today'),
        mentions: { users: new Collection() },
        client: {
            user: { id: 'bot' },
            messageCorpus: { record: async () => calls.push('record') },
            keyv: { get: async () => { calls.push('config'); return 'disabled'; } },
        },
    });
    assert.deepEqual(calls, ['record', 'config']);
});

test('concurrent writes retain distinct messages, deduplicate IDs and isolate quote sources', async t => {
    const corpus = await MessageCorpus.open(':memory:', () => now);
    t.after(() => corpus.close());
    await Promise.all(Array.from({ length: 30 }, (_, i) => corpus.record(message(String(i), `This is quote number ${i}`))));
    await corpus.record(message('0', 'A duplicate delivery is ignored'));
    assert.equal((await corpus.quotes('guild', 'channel', 'user')).length, 30);
    for (const scope of [['other', 'channel', 'user'], ['guild', 'private', 'user'], ['guild', 'channel', 'other']]) {
        assert.deepEqual(await corpus.quotes(...scope), []);
    }
    await corpus.record(message('long', 'word '.repeat(100)));
    assert.equal((await corpus.all('SELECT * FROM messages')).length, 31);
    assert.equal((await corpus.quotes('guild', 'channel', 'user')).length, 30);
});

test('ignores bots, webhooks, DMs and system messages', async t => {
    const corpus = await MessageCorpus.open(':memory:', () => now);
    t.after(() => corpus.close());
    for (const overrides of [{ author: { id: 'bot', bot: true } }, { webhookId: 'hook' }, { guildId: null }, { system: true }]) {
        await corpus.record(message('ignored', undefined, overrides));
    }
    assert.deepEqual(await corpus.all('SELECT * FROM messages'), []);
});

test('random-person quotes preserve author identity, scope, and retention', async t => {
    let time = now;
    const corpus = await MessageCorpus.open(':memory:', () => time);
    t.after(() => corpus.close());
    await corpus.record(message('1'));
    await corpus.record(message('2', 'Someone else has something inspiring', { author: { id: 'other', bot: false } }));
    await corpus.record(message('3', 'A secret quote from elsewhere', { channelId: 'private' }));
    assert.equal((await corpus.randomQuote('guild', 'channel', 'user')).authorId, 'user');
    assert.equal((await corpus.randomQuote('guild', 'channel', 'other')).authorId, 'other');
    for (let i = 0; i < 10; i++) {
        const quote = await corpus.randomQuote('guild', 'channel');
        assert.ok(['user', 'other'].includes(quote.authorId));
        assert.notEqual(quote.content, 'A secret quote from elsewhere');
    }
    assert.equal(await corpus.randomQuote('other-guild', 'channel'), null);
    time += RETENTION_MS + 1;
    assert.equal(await corpus.randomQuote('guild', 'channel'), null);
});

test('phrase search returns the original author, treats SQL characters literally and respects scope/expiry', async t => {
    let time = now;
    const corpus = await MessageCorpus.open(':memory:', () => time);
    t.after(() => corpus.close());
    await corpus.record(message('1', 'You are THE GOAT today', { author: { id: 'original', bot: false } }));
    await corpus.record(message('2', 'You are the goat forever', { channelId: 'private' }));
    await corpus.record(message('3', 'You are the goat forever', { guildId: 'other' }));
    assert.deepEqual(await corpus.findQuote('guild', 'channel', 'the goat'), { content: 'You are THE GOAT today', authorId: 'original' });
    assert.equal(await corpus.findQuote('guild', 'channel', 'missing'), null);
    assert.equal(await corpus.findQuote('guild', 'channel', "%_' OR 1=1 --"), null);
    await corpus.record(message('4', "That's 100%_ the goat's effort"));
    assert.equal((await corpus.findQuote('guild', 'channel', "100%_ the goat's")).authorId, 'user');
    time += RETENTION_MS + 1;
    assert.equal(await corpus.findQuote('guild', 'channel', 'the goat'), null);
});

test('edits, single/bulk deletes and expiry work without cached Discord messages', async t => {
    let time = now;
    const corpus = await MessageCorpus.open(':memory:', () => time);
    t.after(() => corpus.close());
    await corpus.record(message('1'));
    await corpus.update({ guild_id: 'guild', id: '1' }); // embed-only update
    assert.equal((await corpus.quotes('guild', 'channel', 'user')).length, 1);
    await corpus.update({ guild_id: 'guild', id: '1', content: 'This quote has been edited' });
    assert.deepEqual(await corpus.quotes('guild', 'channel', 'user'), ['This quote has been edited']);
    await corpus.update({ guild_id: 'guild', id: '1', content: 'hi <@123> friend' });
    assert.deepEqual(await corpus.quotes('guild', 'channel', 'user'), []);
    await Promise.all(['2', '3', '4'].map(id => corpus.record(message(id))));
    await corpus.remove('other', ['2']);
    assert.equal((await corpus.all('SELECT * FROM messages')).length, 3);
    await corpus.remove('guild', ['2', '3']);
    assert.equal((await corpus.all('SELECT * FROM messages')).length, 1);
    time += RETENTION_MS + 1;
    assert.deepEqual(await corpus.quotes('guild', 'channel', 'user'), []);
    await corpus.prune();
    assert.deepEqual(await corpus.all('SELECT * FROM messages'), []);
});
