const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');

function getFeatureName(featureKey) {
    switch (featureKey) {
        case 'misspelling_corrections':
            return 'Correct Misspellings';
        case 'message_reactions':
            return 'React to Messages';
        case 'mention_response':
            return 'Respond to Mentions';
        case 'repeat_phrase':
            return 'Repeat Phrases';
        default:
            return featureKey;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkfeature')
        .setDescription('Get information about a specific TucsonBot feature')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption((option) =>
            option
                .setName('feature')
                .setDescription('The feature to get info on')
                .setRequired(true)
                .addChoices(
                    { name: 'Correct Misspellings', value: 'misspelling_corrections' },
                    { name: 'React to Messages', value: 'message_reactions' },
                    { name: 'Respond to Mentions', value: 'mention_response' },
                    { name: 'Repeat Phrases', value: 'repeat_phrase' }
                ).setRequired(true)
        )
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        const feature = interaction.options.getString('feature');
        const guildKey = `guild_${interaction.guildId}_config_${feature}`;

        const config = await interaction.client.keyv.get(guildKey);
        if (config === 'disabled') {
            await interaction.reply({ content: `The feature **${getFeatureName(feature)}** is disabled for this server.`, flags: MessageFlags.Ephemeral });
        } else if (config === 'limited') {
            await interaction.reply({ content: `The feature **${getFeatureName(feature)}** is limited to AZ members only for this server.`, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: `The feature **${getFeatureName(feature)}** is enabled for this server.`, flags: MessageFlags.Ephemeral });
        }
    },
};