const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { resolveProfile } = require('../../utils/steam-profile');

module.exports = {
    data: new SlashCommandBuilder().setName('steam').setDescription('Manage your Steam profile')
        .addSubcommand(sub => sub.setName('profile').setDescription('Save your Steam profile for lobby invites')
            .addStringOption(option => option.setName('url').setDescription('Your Steam Community profile URL').setRequired(true))),
    failureMessage: 'Could not save your Steam profile. Try again in a moment.',
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const id = await resolveProfile(interaction.options.getString('url', true));
        await interaction.client.config.setSteamProfile(interaction.user.id, id);
        await interaction.editReply('Steam profile saved. Use /invite while hosting a lobby.');
    },
};
