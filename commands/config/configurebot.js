const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurebot')
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
                    { name: 'Respond to Mentions', value: 'mention_response' }
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
        const feature = interaction.options.getString('feature');
        const enabled = interaction.options.getString('enabled');
        const guildKey = `guild_${interaction.guildId}_config_${feature}`;

        if (enabled === 'enable') {
            await interaction.client.keyv.set(guildKey, 'enabled');
            await interaction.reply({ content: `The feature **${feature}** has been enabled for this server.`, flags: MessageFlags.Ephemeral });
        } else if (enabled === 'disable') {
            await interaction.client.keyv.set(guildKey, 'disabled');
            await interaction.reply({ content: `The feature **${feature}** has been disabled for this server.`, flags: MessageFlags.Ephemeral });
        } else if (enabled === 'limit') {
            await interaction.client.keyv.set(guildKey, 'limited');
            await interaction.reply({ content: `The feature **${feature}** has been limited to AZ members only for this server.`, flags: MessageFlags.Ephemeral });
        }
    },
};