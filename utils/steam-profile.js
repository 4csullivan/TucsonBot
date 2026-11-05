const { UserFacingError } = require('./command-error');
const { lobbyLink } = require('./steam-lobby');

async function profilePage(path) {
    const response = await fetch('https://steamcommunity.com/' + path, {
        signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Steam profile request returned ${response.status}`);
    return response.text();
}

async function resolveProfile(input) {
    const match = /^(?:https?:\/\/)?steamcommunity\.com\/(profiles\/(\d{17})|id\/[\w-]+)\/?$/i.exec(input.trim());
    if (!match) throw new UserFacingError('Enter a Steam Community profile URL using /profiles/ or /id/.');
    if (match[2]) return match[2];
    const xml = await profilePage(match[1] + '/?xml=1');
    const id = /<steamID64>(\d{17})<\/steamID64>/.exec(xml);
    if (!id) throw new UserFacingError('Steam could not resolve that profile. Check the URL or use its numeric /profiles/ link.');
    return id[1];
}

async function currentLobby(id) {
    const html = await profilePage('profiles/' + id + '/');
    // Only read the current game panel. Users can post old lobby links elsewhere on their profile.
    const panel = /<div\b[^>]*\bclass=["'][^"']*\bprofile_in_game\b[^"']*["'][^>]*>/i.exec(html);
    if (!panel) return null;
    const contents = html.slice(panel.index + panel[0].length);
    let depth = 1;
    for (const [tag] of contents.matchAll(/<\/?div\b[^>]*>|<a\s[^>]*>/gi)) {
        if (/^<div\b/i.test(tag)) depth++;
        else if (/^<\/div/i.test(tag)) depth--;
        else {
            const href = /\shref=["']([^"']+)["']/i.exec(tag);
            const link = href && lobbyLink(href[1], { exact: true });
            if (link) return link;
        }
        if (depth === 0) break;
    }
    return null;
}

module.exports = { resolveProfile, currentLobby };

