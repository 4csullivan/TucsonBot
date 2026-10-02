const { AttachmentBuilder, SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');

const Canvas = require('@napi-rs/canvas');
const bgFolder = '../../assets/bg';
const fs = require('fs');

let bgNames = [];

async function setBackgrounds() {
    if (bgNames.length === 0) {
        bgNames = fs.readdir(bgFolder, {withFileTypes: true})
            .filter(item => !item.isDirectory())
            .map(item => item.name)
    }
}

function getBackground() {
    return bgNames[Math.floor(Math.random() * bgNames.length)];
}

const applyText = (canvas, text) => {
    const context = canvas.getContext('2d');
    let fontSize = 60;
        do {
            context.font = `${(fontSize -= 5)}px sans-serif`;
        } while (context.measureText(text).width > canvas.width - 25);
    
    return context.font;
}

async function getLogs(interaction) {
    const logKey = `guild_${interaction.guildId}_user_messages_${interaction.client.user.id}`;
    return await interaction.client.keyv.get(logKey) || [];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inspire')
        .setDescription('Create an inspirational image :D')
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        let quote = "i'm not feeling very inspired :(";
        let username = interaction.client.user.username;

        // set the quote and username (username should be first in array)
        const logs = await getLogs(interaction);
        if (logs.length > 0) {
            username = logs[0];
            quote = logs[1 + Math.floor(Math.random() * eightBallPhrases.length - 1)]
        }


        const canvas = Canvas.createCanvas(500,500);
        const context = canvas.getContext('2d');
        await setBackgrounds();
        const background = await Canvas.loadImage(getBackground());
        context.drawImage(background, 0, 0, canvas.width, canvas.height);

        context.font = applyText(canvas, quote);
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(quote, canvas.width / 2, canvas.height / 3);

        context.font = '28px sans-serif';
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(username, canvas.width / 2, canvas.height / 1.75);

        // generate image
        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'inspire.png' });

        await interaction.reply({ files: [attachment] });
    },
};