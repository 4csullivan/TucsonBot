const { UserFacingError } = require('../../utils/command-error');
const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addrole')
        .setDescription('Add an AZ role for TucsonBot interactions')
        .addRoleOption(option => option.setName('role').setDescription('The role to add for interactions').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const role = interaction.options.getRole('role');
        if (!role?.id) throw new UserFacingError('Invalid role provided. Please try again with a valid role.');

        const added = await interaction.client.config.addRole(interaction.guildId, role.id);
        if (!added) throw new UserFacingError(`The role <@&${role.id}> is already an AZ role for this guild.`);

        await interaction.editReply({ content: `Successfully added <@&${role.id}> to the AZ roles for this guild.` });
    },
};
