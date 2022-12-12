import express from 'express';
import {
    InteractionType,
    InteractionResponseType,
    InteractionResponseFlags,
    MessageComponentTypes,
    ButtonStyleTypes,
} from 'discord-interactions';
import { VerifyDiscordRequest, getRandomEmoji, DiscordRequest } from './utils.js';
import {
    CHALLENGE_COMMAND,
    TEST_COMMAND,
    HasGuildCommands,
    PLAY_COMMAND,
} from './commands.js';

import fs from 'fs';
import ytdl from 'ytdl-core';

import dotenv from 'dotenv';
dotenv.config();
// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest() }));

// Store for in-progress games. In production, you'd want to use a DB
const activeGames = {};


app.post('/interactions', async function (req, res) {
    const { type, id, data } = req.body;

    if (type === InteractionType.PING) {
        return res.send({ type: InteractionResponseType.PONG });
    }

    if (type === InteractionType.APPLICATION_COMMAND) {
        const { name } = data;

        // "test" guild command
        if (name === 'test') {
            // Send a message into the channel where command was triggered from

            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    // Fetches a random emoji to send from a helper function
                    content: 'hello world ' + getRandomEmoji(),
                },
            });
        }

        // "challenge" guild command
        if (name === 'challenge' && id) {
            const userId = req.body.member.user.id;
            // User's object choice
            const objectName = req.body.data.options[0].value;

            console.log('challenge', userId, objectName);
            // Create active game using message ID as the game ID
            activeGames[id] = {
                id: userId,
                objectName,
            };

            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    // Fetches a random emoji to send from a helper function
                    content: `Rock papers scissors challenge from <@${userId}>`,
                    components: [
                        {
                            type: MessageComponentTypes.ACTION_ROW,
                            components: [
                                {
                                    type: MessageComponentTypes.BUTTON,
                                    // Append the game ID to use later on
                                    custom_id: `accept_button_${req.body.id}`,
                                    label: 'Accept',
                                    style: ButtonStyleTypes.PRIMARY,
                                },
                            ],
                        },
                    ],
                },
            }

            );

        }

        // "play" guild command
        if (name === 'play') {
            // Send a message into the channel where command was triggered from
            const song = req.body.data.options[0].value;
            const voiceChannel = req.body.member.voice.channel_id;
            const guildId = req.body.guild_id;
            const channelId = req.body.channel_id;
            const userId = req.body.member.user.id;
            const songInfo = await ytdl.getInfo(song);
            const songTitle = songInfo.videoDetails.title;

            const connection = await DiscordRequest(
                'POST',
                `/voice/channels/${voiceChannel}/connect`,
                {
                    guild_id: guildId,
                    channel_id: voiceChannel,
                    self_mute: false,
                    self_deaf: false,

                }
            );

            const dispatcher = connection.play(ytdl(song, { filter: 'audioonly' }));

            dispatcher.on('finish', () => {
                console.log('Finished playing!');
            }
            );

            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `Playing ${songTitle} in <#${channelId}>`,
                },
            });

        }


    }
});

app.listen(PORT, () => {
    console.log('Listening on port', PORT);

    HasGuildCommands(process.env.APP_ID, process.env.GUILD_ID, [
        TEST_COMMAND,
        CHALLENGE_COMMAND,
        PLAY_COMMAND
    ]);
});