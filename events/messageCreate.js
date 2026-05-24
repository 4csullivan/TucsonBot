const { Client, Events, GatewayIntentBits } = require('discord.js');
const meanData = require('../assets/mean_phrases.json');
const niceData = require('../assets/nice_phrases.json');
const eightBallData = require('../assets/eight_ball_phrases.json');
const questionData = require('../assets/question_phrases.json');
const tucsonFacts = require('../assets/tucson_facts.json');

const meanPhrases = meanData.phrases;
const nicePhrases = niceData.phrases;
const eightBallPhrases = eightBallData.phrases;
const questionPhrases = questionData.phrases;
const tucsonPhrases = tucsonFacts.phrases;

async function replyToMention(message) {
    const messageLower = message.content.toLowerCase();
    const isMean = meanPhrases.some((phrase) => messageLower.includes(phrase));
    const isNice = nicePhrases.some((phrase) => messageLower.includes(phrase));
    const hasQuestion = questionPhrases.some((phrase) => messageLower.includes(phrase));

    const repeatPhrase = 'repeat the phrase';
    const repeatIndex = messageLower.indexOf(repeatPhrase);

    if (repeatIndex !== -1) {
        var phraseToRepeat = messageLower.slice(repeatIndex + repeatPhrase.length).trim();
        if (phraseToRepeat.startsWith(':')) phraseToRepeat = phraseToRepeat.slice(1).trim();
        if (phraseToRepeat.startsWith('"') && phraseToRepeat.endsWith('"')) {
            phraseToRepeat = phraseToRepeat.slice(1, -1);
        }
        if (phraseToRepeat.length > 0) {
            await message.reply(phraseToRepeat);
            return;
        }
    }
    else if (messageLower.endsWith('?') || hasQuestion) {
        const answer = eightBallPhrases[Math.floor(Math.random() * eightBallPhrases.length)];
        await message.reply(answer);
    }
    else if (isMean) {
        await message.reply('Hey that\'s not very nice!');
    }
    else if (isNice) {
        await message.reply('Aw, thank you :D');
    }
    else {
        //await message.reply('You mentioned me!');
    }
}

async function checkForMentions(message) {
    const messageLower = message.content.toLowerCase();
    const hasQuestion = questionPhrases.some((phrase) => messageLower.includes(phrase));
    const startsWithMention = messageLower.startsWith('tucsonbot') || messageLower.startsWith('tucson bot');
    const endsWithMention = messageLower.endsWith('tucsonbot') || messageLower.endsWith('tucson bot');
    if ((startsWithMention || endsWithMention) && (hasQuestion || messageLower.endsWith('?'))) {
        const answer = eightBallPhrases[Math.floor(Math.random() * eightBallPhrases.length)];
        await message.reply(answer);
    }
    else if (isMean(message.content)) {
        await message.react('💔');
    }
    else if (isNice(message.content)) {
        await message.react('💚');
    }
}

function isMean(message) {
    const messageLower = message.toLowerCase();
    return meanPhrases.some((phrase) => messageLower.includes(phrase));
}

function isNice(message) {
    const messageLower = message.toLowerCase();
    return nicePhrases.some((phrase) => messageLower.includes(phrase));
}

let azRoleIds = [];
let isAZ = false;

async function CheckAZ(message) {
    const guildKey = `guild_${message.guildId}_az_roles`;
    azRoleIds = await message.client.keyv.get(guildKey) || [];
    isAZ = azRoleIds.some((roleID) => message.member.roles.cache.has(roleID));
}

const Feature = {
    MISSPELLINGS: 'misspelling_corrections',
    REACTIONS: 'message_reactions',
    RESPONSES: 'mention_response',
}

async function checkFeature(message, feature) {
    const guildKey = `guild_${message.guildId}_config_${feature}`;
    const config = await message.client.keyv.get(guildKey);
    return config;
}

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
        if (message.author.bot) return;

        trigger_words = ['tuscon'];

        try {
            if (message.mentions.users && message.mentions.users.find((user) => user.id === message.client.user.id)) {
                const canRespond = await checkFeature(message, Feature.RESPONSES);
                if (canRespond === 'disabled') return;
                if (canRespond === 'limited') {
                    await CheckAZ(message);
                    if (!isAZ) return;
                }
                await replyToMention(message);
            }
            else if (message.content.toLowerCase().includes('tucsonbot') || message.content.toLowerCase().includes('tucson bot')) {
                const canReact = await checkFeature(message, Feature.REACTIONS);
                if (canReact === 'disabled') return;
                if (canReact === 'limited') {
                    await CheckAZ(message);
                    if (!isAZ) return;
                }
                await checkForMentions(message);
            }
            else if (message.content.toLowerCase().includes('tusconbot') || message.content.toLowerCase().includes('tuscon bot')) {
                const canRespond = await checkFeature(message, Feature.RESPONSES);
                if (canRespond === 'disabled') return;
                if (canRespond === 'limited') {
                    await CheckAZ(message);
                    if (!isAZ) return;
                }
                await message.reply('Oops! You did me dirty! It\'s Tucson!');
            }
            else {
                for (const word of trigger_words) {
                    if (message.content.toLowerCase().includes(word)) {
                        const canCorrect = await checkFeature(message, Feature.MISSPELLINGS);
                        if (canCorrect === 'disabled') return;
                        if (canCorrect === 'limited') {
                            await CheckAZ(message);
                            if (!isAZ) return;
                        }
                        
                        if (isAZ) {
                            const fact = tucsonPhrases[Math.floor(Math.random() * tucsonPhrases.length)];
                            await message.reply(`Oops! It\'s Tucson! Also, it looks like this user is from Arizona! Did you know ${fact}?`);
                        }
                        else {
                            await message.reply('Oops! It\'s Tucson!');
                        }
                        break;
                    }
                }
            }
        } catch (error) {
            console.error(error);
        }
    },
};