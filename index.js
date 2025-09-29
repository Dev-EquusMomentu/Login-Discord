const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuração do Bot (AGORA 100% CORRETA) ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// Usando OS NOMES EXATOS do nosso arquivo .env
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const SERVER_ID = process.env.DISCORD_SERVER_ID;
const ALCHEMIST_ROLE_ID = process.env.DISCORD_ALCHEMIST_ROLE_ID;
const FOUNDER_ROLE_ID = process.env.DISCORD_FOUNDER_ROLE_ID;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;


client.login(BOT_TOKEN);
client.on('ready', () => console.log(`Bot ${client.user.tag} está online!`));

// =======================================================
// O ARAUTO REAL - MENSAGEM DE BOAS-VINDAS
// =======================================================
client.on('guildMemberAdd', member => {
    // A GENTE SÓ DECLARA UMA VEZ
    const welcomeChannelId = process.env.DISCORD_WELCOME_CHANNEL_ID; 
    const decreeChannelId = process.env.DISCORD_DECREE_CHANNEL_ID;
    const philosophyChannelId = process.env.DISCORD_PHILOSOPHY_CHANNEL_ID;
    const winsChannelId = process.env.DISCORD_WINS_CHANNEL_ID;
    const ideasChannelId = process.env.DISCORD_IDEAS_CHANNEL_ID;
    const faqChannelId = process.env.DISCORD_FAQ_CHANNEL_ID;

    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
    if (!welcomeChannel) {
        console.error('Canal de boas-vindas não encontrado!');
        return;
    }

    const welcomeEmbed = {
        color: 0xFFD700, // Nosso dourado de elite
        title: `A New Knight Has Joined the Cavalry!`,
        description: `Welcome to the Cavalry, {member}! Your journey to command your game begins now. We've equipped you with your starting gear. Here is your mission briefing:`,
        fields: [
            {
                name: '📜 Our Code of Honor',
                value: `Every elite unit has a code. Ours is in <#${decreeChannelId}>. Reading it is your first and most crucial step.`,
                inline: false,
            },
            
            { name: '\u200B', value: '\u200B', inline: false },
            {
                name: '🧠 Understand Our \'Why\'',
                value: `We are more than a community; we are a movement. Discover the philosophy that fuels our fire in <#${philosophyChannelId}>.`,
                inline: false,
            },

            { name: '\u200B', value: '\u200B', inline: false },
            {
                name: '🏆 Your Victory',
                value: `Action is our creed. Share your results and celebrate your progress in <#${winsChannelId}>. This is where warriors are forged.`,
                inline: false,
            },

            { name: '\u200B', value: '\u200B', inline: false },
            {
                name: '🏛️ Build With Us',
                value: `This empire is built with every member's insight. Have an idea for a new product, a new community channel, or a new event? This is your senate. The future of the forge is built here, in <#${ideasChannelId}>.`,
                inline: false,
            },

            { name: '\u200B', value: '\u200B', inline: false },
            {
                name: '❓ Questions?',
                value: `For any common questions, our <#${faqChannelId}> channel has the answers. Check there first.`,
                inline: false,
            },
        ],

        thumbnail: {
            url: member.user.displayAvatarURL({ dynamic: true }),
        },
        footer: {
            text: `♞ Equus Momentum`,
            icon_url: 'https://cdn.discordapp.com/attachments/1416376938368471060/1421998810372247583/capathepromptgrimoire11.png?ex=68db1317&is=68d9c197&hm=cab83b8bdc3e45ef329237822f47188403b9fd77396dfed2145cd33ef77d4f8c&', 
        },
        timestamp: new Date(),
    };

    welcomeChannel.send({ embeds: [welcomeEmbed] });
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Rota de callback do Discord
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.send("Error: Authorization code not found. Please try again.");
    }

    try {
        // Troca o código por um token de acesso
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI,
                scope: 'identify guilds.join',
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) {
            console.error("Error fetching token:", tokenData);
            return res.send("An error occurred while authenticating with Discord.");
        }
        
        const accessToken = tokenData.access_token;

        // Pega as informações do usuário
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { authorization: `Bearer ${accessToken}` },
        });
        const user = await userResponse.json();
        const userId = user.id;

        // Adiciona o usuário ao servidor
        const guild = await client.guilds.fetch(SERVER_ID);
        await guild.members.add(userId, { accessToken });
        
        // Adiciona os cargos
        const member = await guild.members.fetch(userId);
        await member.roles.add([ALCHEMIST_ROLE_ID, FOUNDER_ROLE_ID]);
        
        console.log(`User ${userId} added to the server and roles granted.`);

        // Redireciona para uma página de sucesso
        res.send(`
            <style>body{font-family:Arial,sans-serif;background:#18181b;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;} .container{max-width:480px;background:#23232a;border-radius:12px;padding:32px;}</style>
            <div class="container">
                <h1>Success! Welcome to the Cavalry.</h1>
                <p>Your elite roles have been granted. You can now close this window and open your Discord app.</p>
            </div>
        `);

    } catch (error) {
        console.error('Error in callback flow:', error);
        res.status(500).send("An internal server error occurred. Please try again or contact support.");
    }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});