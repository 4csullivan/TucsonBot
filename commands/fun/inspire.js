const { AttachmentBuilder, SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');
const { createInspireImage } = require('../../utils/inspire-image');

const { addQuoteOptions, selectQuote } = require('../../utils/quote-selection');

module.exports = {
    data: addQuoteOptions(new SlashCommandBuilder()
        .setName('inspire')
        .setDescription('Create a quote image from yourself, a random person, or a phrase search')
        .setContexts(InteractionContextType.Guild)),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Use this command in a server.', flags: MessageFlags.Ephemeral });
        }
        if (!interaction.appPermissions?.has(PermissionFlagsBits.AttachFiles)) {
            return interaction.reply({ content: 'I need the Attach Files permission in this channel.', flags: MessageFlags.Ephemeral });
        }
        await interaction.deferReply();
        try {
            const { match, error } = await selectQuote(interaction);
            if (error) {
                return interaction.editReply({ content: error, allowedMentions: { parse: [] } });
            }
            const quote = match?.content || "I'm not feeling very inspired :(";
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
            const canvas = await createInspireImage(quote, displayName);
            const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'inspire.png' })
                .setDescription(`Quote by ${displayName}: ${quote}`.slice(0, 1024));
            await interaction.editReply({ files: [attachment], allowedMentions: { parse: [] } });
        } catch (error) {
            console.error('Failed to generate inspirational image:', error);
            await interaction.editReply({ content: 'Unable to create your inspirational image. Please try again shortly.', allowedMentions: { parse: [] } });
        }
    },
};
