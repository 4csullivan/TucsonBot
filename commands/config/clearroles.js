const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearroles')
        .setDescription('Clear all AZ roles for TucsonBot interactions')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.client.config.clearRoles(interaction.guildId);
        await interaction.editReply({ content: 'All AZ roles have been cleared.' });
    },
};