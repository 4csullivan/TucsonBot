const { UserFacingError } = require('../../utils/command-error');
const { AttachmentBuilder, SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const { loadImage } = require('@napi-rs/canvas');
const { renderGenius } = require('../../utils/genius-image');

const { addQuoteOptions, selectQuote } = require('../../utils/quote-selection');

module.exports = {
    failureMessage: 'Unable to create your quote image. Please try again shortly.',
    data: addQuoteOptions(new SlashCommandBuilder()
        .setName('genius')
        .setDescription('Create a quote image from yourself, a random person, or a phrase search')
        .setContexts(InteractionContextType.Guild)),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            throw new UserFacingError('Use this command in a server.');
        }
        if (!interaction.appPermissions?.has(PermissionFlagsBits.AttachFiles)) {
            throw new UserFacingError('I need the Attach Files permission in this channel.');
        }
        const { match, error } = await selectQuote(interaction);
        if (error) {
            throw new UserFacingError(error);
        }
        await interaction.deferReply();
        const quote = match?.content || "I don't feel very genius :(";
        let user = interaction.user;
        let member = interaction.member;
        if (match && match.authorId !== user.id) {
            try {
                member = await interaction.guild.members.fetch(match.authorId);
                user = member.user;
            } catch (error) {
                // A departed member still has a Discord user profile.
                if (error.code !== 10007) throw error;
                member = null;
                user = await interaction.client.users.fetch(match.authorId);
            }
        }
        const displayName = member?.displayName || member?.nick || user.displayName || user.username;
        const avatarURL = (typeof member?.displayAvatarURL === 'function' ? member : user)
            .displayAvatarURL({ extension: 'png', size: 1024, forceStatic: true });
        const response = await fetch(avatarURL, { signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error(`Avatar download failed (${response.status})`);
        const avatar = await loadImage(Buffer.from(await response.arrayBuffer()));
        const canvas = renderGenius({ avatar, quote, displayName, serverName: interaction.guild.name });
        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'genius.png' })
            .setDescription(`Quote by ${displayName} in ${interaction.guild.name}: ${quote}`.slice(0, 1024));
        await interaction.editReply({ files: [attachment], allowedMentions: { parse: [] } });
    },
};
