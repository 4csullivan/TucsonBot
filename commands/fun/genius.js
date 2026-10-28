const { AttachmentBuilder, SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');
const { loadImage } = require('@napi-rs/canvas');
const { renderGenius } = require('../../utils/genius-image');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('genius')
        .setDescription('Create a quote image from your messages or search this channel by phrase')
        .addStringOption(option => option.setName('phrase')
            .setDescription('Find a random quote containing this phrase, from anyone in this channel')
            .setMinLength(1).setMaxLength(100))
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Use this command in a server.', flags: MessageFlags.Ephemeral });
        }
        if (!interaction.appPermissions?.has(PermissionFlagsBits.AttachFiles)) {
            return interaction.reply({ content: 'I need the Attach Files permission in this channel.', flags: MessageFlags.Ephemeral });
        }
        await interaction.deferReply();
        try {
            const phraseOption = interaction.options.getString('phrase');
            const phrase = phraseOption?.replace(/\s+/gu, ' ').trim();
            if (phraseOption !== null && !phrase) {
                return interaction.editReply({ content: 'Enter a phrase containing more than whitespace.', allowedMentions: { parse: [] } });
            }
            let quote;
            let user = interaction.user;
            let member = interaction.member;
            if (phrase) {
                const match = await interaction.client.messageCorpus.findQuote(interaction.guildId, interaction.channelId, phrase);
                if (!match) {
                    return interaction.editReply({ content: 'No saved quotes match that phrase in this channel. Try another phrase.', allowedMentions: { parse: [] } });
                }
                quote = match.content;
                if (match.authorId !== user.id) {
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
            } else {
                const quotes = await interaction.client.messageCorpus.quotes(interaction.guildId, interaction.channelId, user.id);
                quote = quotes.length ? quotes[Math.floor(Math.random() * quotes.length)] : "I'm still waiting for my genius moment.";
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
        } catch (error) {
            console.error('Failed to generate genius image:', error);
            await interaction.editReply({ content: 'I could not create your quote image. Please try again shortly.', allowedMentions: { parse: [] } });
        }
    },
};
