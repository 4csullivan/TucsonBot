const { test } = require('node:test');
const { MessageFlags } = require('discord.js');
const assert = require('node:assert/strict');
const { loadImage } = require('@napi-rs/canvas');
const dispatcher = require('../events/interactionCreate');
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
            let payload;
            const interaction = {
                isChatInputCommand: () => true, commandName: 'inspire',
                inGuild: () => true, appPermissions: { has: () => true },
                guildId: 'guild', channelId: 'channel', user: { id: 'self', username: 'My Name' },
                options: { getString: name => name === 'source' ? source : null },
                client: { commands: new Map([[command.data.name, command]]), messageCorpus: { randomQuote: async (...scope) => {
                    assert.deepEqual(scope, ['guild', 'channel', source === 'random' ? null : 'self']);
                    return empty ? null : { content: 'This is a very inspiring quote', authorId: source === 'random' ? 'other' : 'self' };
                } } },
                guild: { members: { fetch: async id => {
                    assert.equal(id, 'other');
                    return { displayName: 'Original Author', user: { id: 'other' } };
                } } },
                async deferReply(options) {
                    assert.equal(options, undefined);
                    this.deferred = true;
                },
                reply: async message => {
                    assert.equal(message.flags, MessageFlags.Ephemeral);
                    payload = message;
                },
                async editReply(message) {
                    assert.equal(this.deferred, true);
                    assert.ok(message.files);
                    assert.equal(message.content, undefined);
                    payload = message;
                },
            };
            await dispatcher.execute(interaction);
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
