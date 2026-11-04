const { Events } = require('discord.js');
const { UserFacingError, replyWithError } = require('../utils/command-error');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;
        const command = interaction.client.commands.get(interaction.commandName);
        try {
            if (!command) throw new Error(`No command matching ${interaction.commandName} was found.`);
            await command.execute(interaction);
        } catch (error) {
            const expected = error instanceof UserFacingError;
            if (!expected) console.error(`Command /${interaction.commandName} failed`, error);
            const message = expected ? error.message : command?.failureMessage ?? 'There was an error while executing this command!';
            try {
                await replyWithError(interaction, message);
            } catch (replyError) {
                console.error('Failed to deliver private command error:', replyError);
            }
        }
    },
};
