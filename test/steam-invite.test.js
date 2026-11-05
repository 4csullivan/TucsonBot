const test = require('node:test');
const assert = require('node:assert/strict');
const { currentLobby, resolveProfile } = require('../utils/steam-profile');
const { GuildConfig } = require('../utils/guild-config');
const invite = require('../commands/utility/invite');

const id = '76561198267291751';
const path = 'joinlobby/553310/109775243399672693/' + id;
const anchor = `<a href="steam://${path}">Join Game</a>`;

test('profile setup resolves a vanity URL and saves the stable ID per Discord user', async t => {
    t.mock.method(global, 'fetch', async url => {
        assert.equal(url, 'https://steamcommunity.com/id/example/?xml=1');
        return new Response(`<profile><steamID64>${id}</steamID64></profile>`);
    });
    const config = await GuildConfig.open(':memory:');
    t.after(() => config.close());
    await config.setSteamProfile('host', await resolveProfile('https://steamcommunity.com/id/example/'));
    assert.equal(await config.getSteamProfile('host'), id);
    assert.equal(await config.getSteamProfile('friend'), undefined);
    await assert.rejects(resolveProfile('https://example.com/id/example'));
});

test('invite uses only the current game panel and mentions only the selected friend', async t => {
    let html = `<div class="profile_in_game persona"><div>Game</div>${anchor}</div>`;
    t.mock.method(global, 'fetch', async url => {
        assert.equal(url, `https://steamcommunity.com/profiles/${id}/`);
        return new Response(html);
    });
    for (const friend of [null, { id: '123' }]) {
        let reply;
        await invite.execute({
            user: { id: '456' }, options: { getUser: () => friend },
            client: { config: { getSteamProfile: async () => id } },
            deferReply: async () => {}, editReply: async payload => { reply = payload; },
        });
        assert.equal(reply.components[0].toJSON().components[0].url, 'https://linkoid.github.io/steamuri/' + path);
        assert.deepEqual(reply.allowedMentions.users, friend ? [friend.id] : []);
    }
    html = `<div class="profile_in_game persona"><div>Online</div></div>${anchor}`;
    assert.equal(await currentLobby(id), null);
});
