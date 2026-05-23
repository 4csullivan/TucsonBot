const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addrole')
        .setDescription('Add an AZ role for interactions')
        .addRoleOption(option => option.setName('role').setDescription('The role to add for interactions').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        const role = interaction.options.getRole('role');
        const guildKey = `guild_${interaction.guildId}_az_roles`;
        
        if (role.id) {
            const existingRoles = await interaction.client.keyv.get(guildKey) || [];
            if (existingRoles.includes(role.id)) {
                return await interaction.reply({ content: `The role <@&${role.id}> is already an AZ role for this guild.`, flags: MessageFlags.Ephemeral });
            }

            existingRoles.push(role.id);

            await interaction.client.keyv.set(guildKey, existingRoles);
            await interaction.reply({ content: `Successfully added <@&${role.id}> to the AZ roles for this guild.`, flags: MessageFlags.Ephemeral });
        }
        else {
            await interaction.reply({ content: 'Invalid role provided. Please try again with a valid role.', flags: MessageFlags.Ephemeral });
        }
    },
};