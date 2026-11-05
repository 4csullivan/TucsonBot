const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const prefix = 'https://linkoid.github.io/steamuri/';
const lobbyPattern = /(?<![\w/])steam:\/\/(joinlobby\/\d{1,10}\/\d{1,20}\/\d{1,20})(?=$|[\s>)\]!`"']|[.,](?=\s|$))/i;

function lobbyLink(text, { exact = false } = {}) {
    const input = text.trim();
    const match = lobbyPattern.exec(input);
    if (!match || (exact && match[0] !== input)) return null;
    return prefix + match[1].toLowerCase();
}

function lobbyRow(link) {
    const button = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Join Steam lobby').setURL(link);
    return new ActionRowBuilder().addComponents(button);
}

module.exports = { lobbyLink, lobbyRow };
