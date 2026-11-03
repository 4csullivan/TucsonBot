const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkroles')
        .setDescription('Check current AZ roles for interactions')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const azRoleIDs = await interaction.client.config.getRoles(interaction.guildId);
        if (azRoleIDs.length > 0) {
            const roleMentions = azRoleIDs.map((id) => `<@&${id}>`).join(', ');
            await interaction.editReply({ content: `Current AZ roles are: ${roleMentions}` });
        } else {
            await interaction.editReply({ content: 'No AZ role set for this guild.' });
        }
    },
};