const { AttachmentBuilder, SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');
const { createInspireImage } = require('../../utils/inspire-image');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inspire')
        .setDescription('Put a saved quote on a random inspirational background')
        .setContexts(InteractionContextType.Guild)
        .addStringOption(option => option.setName('source')
            .setDescription('Use your own quotes (default) or pick a random person in this channel')
            .addChoices({ name: 'Self', value: 'self' }, { name: 'Anyone', value: 'random' })),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Use this command in a server.', flags: MessageFlags.Ephemeral });
        }
        if (!interaction.appPermissions?.has(PermissionFlagsBits.AttachFiles)) {
            return interaction.reply({ content: 'I need the Attach Files permission in this channel.', flags: MessageFlags.Ephemeral });
        }
        await interaction.deferReply();
        try {
            const randomPerson = interaction.options.getString('source') === 'random';
            const match = await interaction.client.messageCorpus.randomQuote(interaction.guildId, interaction.channelId,
                randomPerson ? null : interaction.user.id);
            if (!match && randomPerson) {
                return interaction.editReply({ content: 'No saved quotes are available in this channel yet.', allowedMentions: { parse: [] } });
            }
            const quote = match?.content || "I'm not feeling very inspired :(";
            let user = interaction.user;
            let member = interaction.member;
            if (match && match.authorId !== user.id) {
                try {
                    member = await interaction.guild.members.fetch(match.authorId);
                    user = member.user;
                } catch (error) {
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
