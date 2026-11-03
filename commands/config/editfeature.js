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
        .setName('editfeature')
        .setDescription('Enable, disable, or limit TucsonBot features for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption((option) =>
            option
                .setName('feature')
                .setDescription('The feature to configure')
                .setRequired(true)
                .addChoices(
                    { name: 'Correct Misspellings', value: 'misspelling_corrections' },
                    { name: 'React to Messages', value: 'message_reactions' },
                    { name: 'Respond to Mentions', value: 'mention_response' },
                    { name: 'Repeat Phrases', value: 'repeat_phrase' }
                ).setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('enabled')
                .setDescription('Enable, disable, or limit the feature')
                .setRequired(true)
                .addChoices(
                    { name: 'Enable', value: 'enable' },
                    { name: 'Disable', value: 'disable' },
                    { name: 'Limit to AZ members only', value: 'limit' }
                ).setRequired(true)
        )
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const feature = interaction.options.getString('feature');
        const enabled = interaction.options.getString('enabled');

        if (enabled === 'enable') {
            await interaction.client.config.setFeature(interaction.guildId, feature, 'enabled');
            await interaction.editReply({ content: `The feature **${getFeatureName(feature)}** has been enabled for this server.` });
        } else if (enabled === 'disable') {
            await interaction.client.config.setFeature(interaction.guildId, feature, 'disabled');
            await interaction.editReply({ content: `The feature **${getFeatureName(feature)}** has been disabled for this server.` });
        } else if (enabled === 'limit') {
            await interaction.client.config.setFeature(interaction.guildId, feature, 'limited');
            await interaction.editReply({ content: `The feature **${getFeatureName(feature)}** has been limited to AZ members only for this server.` });
        }
    },
};