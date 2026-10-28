const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { readdir } = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { wrapText, fitLabel } = require('./genius-image');

const serifPath = '/usr/share/fonts/noto/NotoSerif-Regular.ttf';
if (existsSync(serifPath)) GlobalFonts.registerFromPath(serifPath, 'Noto Serif');
const FONT = '"Noto Serif", Georgia, "Noto Color Emoji", serif';

async function createInspireImage(quote, displayName) {
    const directory = path.join(__dirname, '../assets/bg');
    const backgrounds = (await readdir(directory)).filter(name => /\.(png|jpe?g|webp)$/iu.test(name));
    if (!backgrounds.length) throw new Error('No inspirational backgrounds available');
    const background = await loadImage(path.join(directory, backgrounds[Math.floor(Math.random() * backgrounds.length)]));
    return renderInspire({ background, quote, displayName });
}

function renderInspire({ background, quote, displayName }) {
    const canvas = createCanvas(800, 800);
    const context = canvas.getContext('2d');
    const scale = Math.max(800 / background.width, 800 / background.height);
    context.drawImage(background, (800 - background.width * scale) / 2, (800 - background.height * scale) / 2,
        background.width * scale, background.height * scale);
    let fontSize = 70;
    let lines;
    const text = Array.from(quote.replace(/\s+/gu, ' ').trim()).slice(0, 1000).join('');
    for (; fontSize >= 24; fontSize -= 2) {
        context.font = `${fontSize}px ${FONT}`;
        lines = wrapText(context, text, 700);
        if (lines.length * fontSize * 1.25 <= 540 || fontSize === 24) break;
    }
    const maxLines = Math.floor(540 / (fontSize * 1.25));
    if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        lines[maxLines - 1] = fitLabel(context, `${lines[maxLines - 1]}…`, 700);
    }
    const lineHeight = fontSize * 1.25;
    const startY = 360 - (lines.length - 1) * lineHeight / 2;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#000000';
    context.lineWidth = 3;
    context.lineJoin = 'round';
    context.shadowColor = 'rgba(0,0,0,0.7)';
    context.shadowBlur = 20;
    context.shadowOffsetX = 4;
    context.shadowOffsetY = 4;
    lines.forEach((line, index) => {
        context.strokeText(line, 400, startY + index * lineHeight);
        context.fillText(line, 400, startY + index * lineHeight);
    });
    context.font = `36px ${FONT}`;
    const label = fitLabel(context, displayName, 700);
    const labelY = startY + lines.length * lineHeight + 30;
    context.strokeText(label, 400, labelY);
    context.fillText(label, 400, labelY);
    return canvas;
}

module.exports = { createInspireImage, renderInspire };
