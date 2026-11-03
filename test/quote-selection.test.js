const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectQuote } = require('../utils/quote-selection');

test('both image commands expose identical optional quote modes', () => {
    const options = ['genius', 'inspire'].map(name => require(`../commands/fun/${name}`).data.toJSON().options);
    assert.deepEqual(options[0], options[1]);
    assert.deepEqual(options[0].map(option => option.name), ['phrase', 'source']);
});

test('quote selection scopes searches and handles invalid or empty results', async () => {
    for (const options of [{}, { source: 'self' }, { source: 'random' }, { phrase: ' the   goat ' }, { phrase: '   ' }, { phrase: 'quote', source: 'random' }, { phrase: 'quote', source: 'self' }]) {
        for (const empty of [false, true]) {
            const calls = [];
            const match = empty ? null : { content: 'You are the goat today', authorId: 'author' };
            const result = await selectQuote({
                options: { getString: name => options[name] ?? null },
                guildId: 'guild', channelId: 'channel', user: { id: 'self' },
                client: { messageCorpus: {
                    randomQuote: async (...args) => { calls.push(['source', ...args]); return match; },
                } },
            });
            if (options.phrase === '   ') {
                assert.equal(calls.length, 0);
                assert.ok(result.error);
            } else {
                const expected = ['source', 'guild', 'channel', options.source === 'random' ? null : 'self',
                    ...(options.phrase ? [options.phrase.trim().replace(/\s+/gu, ' ')] : [])];
                assert.deepEqual(calls, [expected]);
                if (empty && (options.phrase || options.source === 'random')) assert.match(result.error, /No saved quotes/);
                else assert.equal(result.match, match);
            }
        }
    }
});
