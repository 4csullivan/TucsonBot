const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkroles')
        .setDescription('Check current AZ roles for interactions')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        const guildKey = `guild_${interaction.guildId}_az_roles`;
        const azRoleIDs = await interaction.client.keyv.get(guildKey) || [];
        if (azRoleIDs.length > 0) {
            const roleMentions = azRoleIDs.map((id) => `<@&${id}>`).join(', ');
            await interaction.reply({ content: `Current AZ roles are: ${roleMentions}`, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: 'No AZ role set for this guild.', flags: MessageFlags.Ephemeral });
        }
    },
};