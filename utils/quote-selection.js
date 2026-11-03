const { SlashCommandStringOption } = require('discord.js');

function addQuoteOptions(builder) {
    return builder
        .addStringOption(new SlashCommandStringOption().setName('phrase')
            .setDescription('Search saved quotes in this channel; optionally filter by source')
            .setMinLength(1).setMaxLength(100))
        .addStringOption(new SlashCommandStringOption().setName('source')
            .setDescription('Use your own quotes (default) or pick a random person, including with phrase search')
            .addChoices({ name: 'Self', value: 'self' }, { name: 'Anyone', value: 'random' }));
}

async function selectQuote(interaction) {
    const phraseOption = interaction.options.getString('phrase');
    const source = interaction.options.getString('source');
    const phrase = phraseOption?.replace(/\s+/gu, ' ').trim();
    if (phraseOption != null && !phrase) {
        return { error: 'Please enter a phrase containing more than whitespace.' };
    }
    const corpus = interaction.client.messageCorpus;
    const match = await corpus.randomQuote(interaction.guildId, interaction.channelId,
        source === 'random' ? null : interaction.user.id, ...(phrase ? [phrase] : []));
    if (!match && phrase) {
        return { error: 'No saved quotes match that phrase in this channel. Try another phrase.' };
    }
    if (!match && source === 'random') {
        return { error: 'No saved quotes are available in this channel yet.' };
    }
    return { match };
}

module.exports = { addQuoteOptions, selectQuote };
