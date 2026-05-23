/* DEPRECATED!!

const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setrole')
        .setDescription('Set AZ role for interactions')
        .addRoleOption(option => option.setName('role').setDescription('The role to set for interactions').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        const role = interaction.options.getRole('role');
        
        if (role.id) {
            await interaction.client.keyv.set(`guild_${interaction.guildId}_az_role`, role.id);
            console.log(`Set AZ role for guild ${interaction.guildId} to ${role.id}`);
            await interaction.reply({ content: `AZ role has been set to <@&${role.id}>`, flags: MessageFlags.Ephemeral });
        }
        else {
            await interaction.reply({ content: 'Invalid role provided. Please try again with a valid role.', flags: MessageFlags.Ephemeral });
        }
    },
};
*/