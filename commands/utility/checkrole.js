const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkrole')
        .setDescription('Check current AZ role for interactions')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        const roleID = await interaction.client.keyv.get(`guild_${interaction.guildId}_az_role`);
        if (roleID) {
            await interaction.reply({ content: `Current AZ role is <@&${roleID}>`, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: 'No AZ role set for this guild.', flags: MessageFlags.Ephemeral });
        }
    },
};