const { AttachmentBuilder, SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } = require('discord.js');

const Canvas = require('@napi-rs/canvas');
const fs = require('node:fs');
const path = require('node:path');
const bgPath = path.join(__dirname, '../../assets/bg');

let bgNames = [];

function setBackgrounds() {
    if (bgNames.length === 0) {
        fs.readdirSync(bgPath).forEach(item => {
            bgNames.push(path.resolve(bgPath, item));
        });
    }
}

function getBackground() {
    return bgNames[Math.floor(Math.random() * bgNames.length)];
}

const applyText = (canvas, text) => {
    const context = canvas.getContext('2d');
    let fontSize = 40;
        do {
            context.font = `${(fontSize -= 5)}px Georgia`;
        } while (context.measureText(text).width > canvas.width - 5);
    
    return context.font;
}

async function getLogs(interaction) {
    const logKey = `guild_${interaction.guildId}_user_messages_${interaction.member.id}`;
    return await interaction.client.keyv.get(logKey) || [];
}

const getWrappedTextConfig = (canvas, text) => {
    const context = canvas.getContext('2d');
    let fontSize = 70;
    const minFontSize = 24; // The threshold where it switches to multi-line
    const maxWidth = canvas.width - 50;

    // 1. Try to shrink the font until it fits on one line or hits the minimum size
    do {
        context.font = `${fontSize}px Georgia`;
        if (context.measureText(text).width <= maxWidth) {
            return { font: context.font, lines: [text] };
        }
        fontSize -= 4; // Smaller steps give smoother sizing
    } while (fontSize >= minFontSize);

    // 2. If it still doesn't fit at minFontSize, switch to multi-line word wrapping
    context.font = `${minFontSize}px Georgia`;
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = context.measureText(currentLine + " " + word).width;
        
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);

    return { font: context.font, lines };
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inspire')
        .setDescription('Create an inspirational image :D')
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        let quote = "i'm not feeling very inspired :(";
        let username = interaction.member.displayName;

        // set the quote and username (username should be first in array)
        const logs = await getLogs(interaction);
        if (logs.length > 0) {
            username = logs[0];
            const randomIndex = Math.max(1, Math.floor(Math.random() * logs.length));
            quote = logs[randomIndex];
        }
        console.log('logs', logs);

        const canvas = Canvas.createCanvas(500,500);
        const context = canvas.getContext('2d');
        setBackgrounds();
        const background = await Canvas.loadImage(getBackground());
        context.drawImage(background, 0, 0, canvas.width, canvas.height);
        
        const {font, lines} = getWrappedTextConfig(canvas, quote);
        context.font = font;
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        context.shadowColor = 'rgba(0,0,0,0.5)';
        context.shadowBlur = 10;
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        context.strokeStyle = '#000000';
        context.lineWidth = 2;
        context.lineJoin = 'miter';

        const fontSize = parseInt(font.match(/\d+/)[0]);
        const lineHeight = fontSize * 1.2;
        const totalTextHeight = lines.length * lineHeight;
        let startY = (canvas.height / 2) - (totalTextHeight / 2);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        lines.forEach((line, index) => {
            const currentY = startY + (index * lineHeight);
            context.strokeText(line, centerX, currentY);
            context.fillText(line, centerX, currentY);
        });

        context.font = '26px Georgia';
        context.fillStyle = 'rgba(255, 255, 255, 0.9)';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        //context.strokeText(username, centerX, totalTextHeight + startY);
        context.fillText(username, centerX, totalTextHeight + startY);

        // generate image
        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'inspire.png' });

        await interaction.reply({ files: [attachment] });
    },
};