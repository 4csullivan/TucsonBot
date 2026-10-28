const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const command = require('../commands/fun/genius');
const { renderGenius } = require('../utils/genius-image');

test('renders a PNG with a black footer and white quote strips', async () => {
    const avatar = createCanvas(400, 200);
    const ctx = avatar.getContext('2d');
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 400, 200);
    for (const quote of ['A little genius goes a long way.', 'W'.repeat(2000), 'Hello 🌵 世界']) {
        const canvas = renderGenius({ avatar, quote, displayName: 'A'.repeat(100), serverName: 'Tucson' });
        assert.equal(canvas.width, 1000);
        assert.equal(canvas.height, 1000);
        assert.deepEqual([...canvas.getContext('2d').getImageData(0, 999, 1, 1).data], [0, 0, 0, 255]);
        assert.equal((await loadImage(await canvas.encode('png'))).width, 1000);
    }
});

test('phrase search uses the original author profile and reports no matches without generating an image', async () => {
    const originalFetch = global.fetch;
    const avatar = await createCanvas(20, 20).encode('png');
    try {
        for (const scenario of ['member', 'departed', 'no-match', 'blank']) {
            let payload;
            let fetchedAvatar = false;
            const author = { id: 'author', displayName: 'Original Author', displayAvatarURL: () => 'https://cdn.discordapp.com/author.png' };
            global.fetch = async url => {
                fetchedAvatar = true;
                assert.equal(url, 'https://cdn.discordapp.com/author.png');
                return { ok: true, arrayBuffer: async () => avatar };
            };
            await command.execute({
                inGuild: () => true, appPermissions: { has: () => true },
                guildId: 'guild', channelId: 'channel',
                user: { id: 'invoker' },
                options: { getString: () => scenario === 'blank' ? '   ' : '  the   goat  ' },
                guild: { name: 'Server', members: { fetch: async id => {
                    assert.equal(id, 'author');
                    if (scenario === 'departed') throw Object.assign(new Error('Unknown Member'), { code: 10007 });
                    return { user: author, displayName: 'Server Nickname', displayAvatarURL: author.displayAvatarURL };
                } } },
                client: {
                    users: { fetch: async id => { assert.equal(id, 'author'); return author; } },
                    messageCorpus: { findQuote: async (...args) => {
                        assert.deepEqual(args, ['guild', 'channel', 'the goat']);
                        return scenario === 'no-match' ? null : { content: 'You are the goat today', authorId: 'author' };
                    } },
                },
                deferReply: async () => {}, editReply: async reply => { payload = reply; },
            });
            if (scenario === 'no-match' || scenario === 'blank') {
                assert.equal(fetchedAvatar, false);
                assert.match(payload.content, scenario === 'no-match' ? /No saved quotes/ : /whitespace/);
            } else {
                assert.match(payload.files[0].description, scenario === 'departed' ? /Original Author/ : /Server Nickname/);
                assert.match(payload.files[0].description, /You are the goat today/);
            }
        }
    } finally {
        global.fetch = originalFetch;
    }
});

test('command defers before work, scopes quotes to the current channel, and handles empty histories', async () => {
    const originalFetch = global.fetch;
    const avatar = await createCanvas(20, 20).encode('png');
    try {
        global.fetch = async () => ({ ok: true, arrayBuffer: async () => avatar });
        for (const quotes of [[], ['The only real quote']]) {
            const calls = [];
            const interaction = {
                inGuild: () => true,
                appPermissions: { has: () => true },
                guildId: 'guild', channelId: 'channel', guild: { name: 'Server' },
                user: { id: 'user', username: 'User', displayAvatarURL: () => 'https://cdn.discordapp.com/avatar.png' },
                options: { getString: () => null },
                client: { messageCorpus: { quotes: async (...scope) => {
                    assert.equal(calls[0], 'defer');
                    assert.deepEqual(scope, ['guild', 'channel', 'user']);
                    return quotes;
                } } },
                deferReply: async () => calls.push('defer'),
                editReply: async payload => calls.push(payload),
            };
            await command.execute(interaction);
            assert.equal(calls[1].files[0].name, 'genius.png');
            assert.match(calls[1].files[0].description, quotes.length ? /The only real quote/ : /genius moment/);
            assert.deepEqual(calls[1].allowedMentions, { parse: [] });
        }
        assert.equal(command.data.toJSON().name, 'genius');
    } finally {
        global.fetch = originalFetch;
    }
});
