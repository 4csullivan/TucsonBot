const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadImage } = require('@napi-rs/canvas');
const command = require('../commands/fun/inspire');
const { createInspireImage } = require('../utils/inspire-image');

test('inspire creates an 800px PNG from the existing backgrounds', async () => {
    const canvas = await createInspireImage('Every great idea starts somewhere in Tucson.', 'Tucson Explorer');
    const image = await loadImage(await canvas.encode('png'));
    assert.equal(image.width, 800);
    assert.equal(image.height, 800);
});

test('inspire supports own/random sources, original attribution, and empty histories', async () => {
    for (const source of [null, 'self', 'random']) {
        for (const empty of [false, true]) {
            let deferred = false;
            let payload;
            const interaction = {
                inGuild: () => true, appPermissions: { has: () => true },
                guildId: 'guild', channelId: 'channel', user: { id: 'self', username: 'My Name' },
                options: { getString: () => source },
                client: { messageCorpus: { randomQuote: async (...scope) => {
                    assert.equal(deferred, true);
                    assert.deepEqual(scope, ['guild', 'channel', source === 'random' ? null : 'self']);
                    return empty ? null : { content: 'This is a very inspiring quote', authorId: source === 'random' ? 'other' : 'self' };
                } } },
                guild: { members: { fetch: async id => {
                    assert.equal(id, 'other');
                    return { displayName: 'Original Author', user: { id: 'other' } };
                } } },
                deferReply: async () => { deferred = true; },
                editReply: async reply => { payload = reply; },
            };
            await command.execute(interaction);
            if (source === 'random' && empty) {
                assert.match(payload.content, /No saved quotes/);
                assert.equal(payload.files, undefined);
            } else {
                assert.equal(payload.files[0].name, 'inspire.png');
                assert.match(payload.files[0].description, source === 'random' ? /Original Author/ : /My Name/);
            }
            assert.deepEqual(payload.allowedMentions, { parse: [] });
        }
    }
});
