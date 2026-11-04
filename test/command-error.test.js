const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');
const dispatcher = require('../events/interactionCreate');
const { UserFacingError } = require('../utils/command-error');

for (const [state, method] of [
    [{}, 'reply'],
    [{ deferred: true, ephemeral: true }, 'editReply'],
    [{ deferred: true, replied: true }, 'followUp'],
]) {
    test(`dispatches a private validation error via ${method}`, async () => {
        let payload;
        const command = { execute() { throw new UserFacingError('Choose a role.'); } };
        await dispatcher.execute({
            ...state,
            isChatInputCommand: () => true,
            commandName: 'example',
            client: { commands: new Map([['example', command]]) },
            [method]: async message => { payload = message; },
        });
        assert.equal(payload.content, 'Choose a role.');
        if (method !== 'editReply') assert.equal(payload.flags, MessageFlags.Ephemeral);
        assert.deepEqual(payload.allowedMentions, { parse: [] });
    });
}

test('unexpected failure details stay in the log', async t => {
    const log = t.mock.method(console, 'error', () => {});
    const error = new Error('Internal database details');
    const command = { execute() { throw error; } };
    let payload;
    await dispatcher.execute({
        isChatInputCommand: () => true,
        commandName: 'example',
        client: { commands: new Map([['example', command]]) },
        reply: async message => { payload = message; },
    });
    assert.equal(payload.flags, MessageFlags.Ephemeral);
    assert.equal(payload.content, 'There was an error while executing this command!');
    assert.equal(log.mock.calls[0].arguments[1], error);
});
