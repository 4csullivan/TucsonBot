const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearroles')
        .setDescription('Clear all AZ roles for TucsonBot interactions')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        const guildKey = `guild_${interaction.guildId}_az_roles`;
        await interaction.client.keyv.delete(guildKey);
        await interaction.reply({ content: 'All AZ roles have been cleared.', flags: MessageFlags.Ephemeral });
    },
};