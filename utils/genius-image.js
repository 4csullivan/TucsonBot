const { createCanvas } = require('@napi-rs/canvas');

const FONT = 'Arial, "Noto Sans", "Noto Color Emoji", sans-serif';

function wrapText(context, text, maxWidth) {
    const lines = [];
    let line = '';
    for (const word of text.split(/\s+/u)) {
        if (line && context.measureText(`${line} ${word}`).width <= maxWidth) {
            line += ` ${word}`;
            continue;
        }
        if (line) lines.push(line);
        line = '';
        // Split oversized tokens as well as wrapping at word boundaries.
        for (const character of word) {
            if (line && context.measureText(line + character).width > maxWidth) {
                lines.push(line);
                line = '';
            }
            line += character;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function fitLabel(context, text, maxWidth) {
    const characters = Array.from(text.replace(/\s+/gu, ' ').trim());
    if (context.measureText(characters.join('')).width <= maxWidth) return characters.join('');
    while (characters.length && context.measureText(`${characters.join('')}…`).width > maxWidth) characters.pop();
    return `${characters.join('')}…`;
}

function renderGenius({ avatar, quote, displayName, serverName }) {
    const canvas = createCanvas(1000, 1000);
    const context = canvas.getContext('2d');
    const photoHeight = 850;
    const scale = Math.max(canvas.width / avatar.width, photoHeight / avatar.height);
    const width = avatar.width * scale;
    const height = avatar.height * scale;
    context.drawImage(avatar, (1000 - width) / 2, (photoHeight - height) / 2, width, height);
    context.fillStyle = 'rgba(0, 0, 0, 0.18)';
    context.fillRect(0, 0, 1000, photoHeight);

    // Bound layout work for unusually long historical messages.
    const characters = Array.from(quote.replace(/\s+/gu, ' ').trim());
    const text = characters.length > 1000 ? `${characters.slice(0, 999).join('')}…` : characters.join('');
    let lines;
    let fontSize = 46;
    for (; fontSize >= 22; fontSize -= 2) {
        context.font = `${fontSize}px ${FONT}`;
        lines = wrapText(context, text, 880);
        if (lines.length * (fontSize + 20) <= 690 || fontSize === 22) break;
    }
    const lineHeight = fontSize + 20;
    const maxLines = Math.floor(690 / lineHeight);
    if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        lines[maxLines - 1] = fitLabel(context, `${lines[maxLines - 1]}…`, 880);
    }
    const top = photoHeight - 48 - lines.length * lineHeight;
    context.textBaseline = 'middle';
    lines.forEach((line, index) => {
        const y = top + index * lineHeight;
        context.fillStyle = '#ffffff';
        context.fillRect(48, y, Math.ceil(context.measureText(line).width) + 24, lineHeight - 10);
        context.fillStyle = '#000000';
        context.fillText(line, 60, y + (lineHeight - 10) / 2);
    });

    context.fillStyle = '#000000';
    context.fillRect(0, photoHeight, 1000, 150);
    context.fillStyle = '#ffffff';
    context.font = `30px ${FONT}`;
    context.fillText(fitLabel(context, displayName, 430), 48, 925);
    context.textAlign = 'right';
    context.fillText(fitLabel(context, serverName, 430), 952, 925);
    return canvas;
}

module.exports = { renderGenius };
