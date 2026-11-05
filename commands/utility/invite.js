const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { UserFacingError } = require('../../utils/command-error');
const { currentLobby } = require('../../utils/steam-profile');
const { lobbyRow } = require('../../utils/steam-lobby');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Share your current Steam lobby in this channel')
        .setContexts(InteractionContextType.Guild)
        .addUserOption(option => option.setName('friend').setDescription('Friend to mention')),
    failureMessage: 'Could not look up your lobby. Paste your Steam lobby link in chat.',
    async execute(interaction) {
        await interaction.deferReply();
        const id = await interaction.client.config.getSteamProfile(interaction.user.id);
        if (!id) throw new UserFacingError('Save your Steam profile with /steam profile first, or paste your Steam lobby link in chat.');
        const link = await currentLobby(id);
        if (!link) throw new UserFacingError('No joinable lobby was visible on your Steam profile. Paste your Steam lobby link in chat.');
        const friend = interaction.options.getUser('friend');
        const host = `<@${interaction.user.id}>`;
        await interaction.editReply({
            content: friend ? `<@${friend.id}>, ${host} invited you to their Steam lobby.` : `Join ${host}’s Steam lobby.`,
            components: [lobbyRow(link)],
            allowedMentions: { parse: [], users: friend ? [friend.id] : [] },
        });
    },
};
