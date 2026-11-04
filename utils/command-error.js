const { MessageFlags } = require('discord.js');

// Only explicitly user-facing messages may cross the command boundary.
class UserFacingError extends Error {}

async function replyWithError(interaction, content) {
    const message = { content, allowedMentions: { parse: [] } };
    const privateMessage = { ...message, flags: MessageFlags.Ephemeral };

    if (interaction.replied) return interaction.followUp(privateMessage);
    if (!interaction.deferred) return interaction.reply(privateMessage);
    if (interaction.ephemeral) return interaction.editReply(message);

    // A first follow-up can inherit the visibility of a pending public reply.
    await interaction.deleteReply();
    return interaction.followUp(privateMessage);
}

module.exports = { UserFacingError, replyWithError };
