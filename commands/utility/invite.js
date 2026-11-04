const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { UserFacingError } = require('../../utils/command-error');
const { lobbyLink } = require('../../utils/steam-lobby');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Invite a friend to your Steam lobby in this channel')
        .setContexts(InteractionContextType.Guild)
        .addUserOption(option => option.setName('friend').setDescription('Friend to invite').setRequired(true))
        .addStringOption(option => option.setName('lobby').setDescription('Your steam://joinlobby link').setRequired(true)),
    async execute(interaction) {
        const friend = interaction.options.getUser('friend', true);
        const link = lobbyLink(interaction.options.getString('lobby', true), { exact: true });
        if (!link) throw new UserFacingError('Paste the full steam://joinlobby link with the game, lobby, and Steam IDs.');
        await interaction.reply({
            content: `<@${friend.id}>, <@${interaction.user.id}> invited you to [join their Steam lobby](${link}).`,
            allowedMentions: { users: [friend.id] },
        });
    },
};
