const { Client, Events, GatewayIntentBits } = require('discord.js');
const meanData = require('../assets/mean_phrases.json');
const niceData = require('../assets/nice_phrases.json');
const eightBallData = require('../assets/eight_ball_phrases.json');
const questionData = require('../assets/question_phrases.json');

const meanPhrases = meanData.phrases;
const nicePhrases = niceData.phrases;
const eightBallPhrases = eightBallData.phrases;
const questionPhrases = questionData.phrases;

async function replyToMention(message) {
    const messageLower = message.content.toLowerCase();
    const isMean = meanPhrases.some((phrase) => messageLower.includes(phrase));
    const isNice = nicePhrases.some((phrase) => messageLower.includes(phrase));
    const hasQuestion = questionPhrases.some((phrase) => messageLower.includes(phrase));

    if (messageLower.endsWith('?') || hasQuestion) {
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
    if ((startsWithMention || endsWithMention) && hasQuestion) {
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

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
        if (message.author.bot) return;

        trigger_words = ['tuscon'];

        try {
            if (message.mentions.users && message.mentions.users.find((user) => user.id === message.client.user.id)) {
                await replyToMention(message);
            }
            else if (message.content.toLowerCase().includes('tucsonbot') || message.content.toLowerCase().includes('tucson bot')) {
                await checkForMentions(message);
            }
            else if (message.content.toLowerCase().includes('tusconbot') || message.content.toLowerCase().includes('tuscon bot')) {
                await message.reply('Oops! You did me dirty! It\'s Tucson!');
            }
            else {
                const azRoleID = await message.client.keyv.get(`guild_${message.guildId}_az_role`);
                const isAZ = azRoleID && message.member.roles.cache.has(azRoleID);

                for (const word of trigger_words) {
                    if (message.content.toLowerCase().includes(word)) {
                        if (isAZ) {
                            await message.reply('Oops! It\'s Tucson! You should know better!');
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