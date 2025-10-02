const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuração do Bot ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// Usando OS NOMES EXATOS do nosso arquivo .env
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const SERVER_ID = process.env.DISCORD_SERVER_ID;
const ALCHEMIST_ROLE_ID = process.env.DISCORD_ALCHEMIST_ROLE_ID;
const FOUNDER_ROLE_ID = process.env.DISCORD_FOUNDER_ROLE_ID;
const VANGUARD_ROLE_ID = process.env.DISCORD_VANGUARD_ROLE_ID; // NOVO CARGO
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI_CUSTOMER = process.env.DISCORD_REDIRECT_URI_CUSTOMER; // NOVO
const REDIRECT_URI_AFFILIATE = process.env.DISCORD_REDIRECT_URI_AFFILIATE; // NOVO

client.login(BOT_TOKEN);
client.on('ready', () => console.log(`Bot ${client.user.tag} está online!`));

// =======================================================
// DIAGNÓSTICO DE VARIÁVEIS - REMOVER DEPOIS
// =======================================================
console.log("----- VARIÁVEIS DE AMBIENTE CARREGADAS -----");
console.log("CLIENT_ID:", CLIENT_ID ? "Carregado" : "FALTANDO!");
console.log("CLIENT_SECRET:", CLIENT_SECRET ? "Carregado" : "FALTANDO!");
console.log("REDIRECT_URI_CUSTOMER:", REDIRECT_URI_CUSTOMER);
console.log("REDIRECT_URI_AFFILIATE:", REDIRECT_URI_AFFILIATE);
console.log("-------------------------------------------");
// =======================================================

// =======================================================
// O ARAUTO REAL - MENSAGEM DE BOAS-VINDAS (VERSÃO FINAL)
// =======================================================
client.on('guildMemberAdd', member => {
    const welcomeChannelId = process.env.DISCORD_WELCOME_CHANNEL_ID;
    const journeyChannelId = process.env.DISCORD_JOURNEY_CHANNEL_ID;

    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
    if (!welcomeChannel) {
        console.error('Canal de boas-vindas não encontrado! Verifique a variável DISCORD_WELCOME_CHANNEL_ID.');
        return;
    }

    if (!journeyChannelId) {
        console.error('ID do canal de jornada não encontrado! Verifique a variável DISCORD_JOURNEY_CHANNEL_ID.');
        return;
    }

    const welcomeEmbed = {
        color: 0xFFD700, // Nosso dourado de elite

        title: `A New Warrior Has Entered the Forge!`,

        thumbnail: {
            url: member.user.displayAvatarURL({ dynamic: true, size: 128 }),
        },

         description: `
**The Cavalry salutes a new warrior. Welcome, ${member}! 👋**

You are at the threshold. To proceed, find your mission briefing and begin your true journey in <#${journeyChannelId}>.
        `,};
    
    welcomeChannel.send({ embeds: [welcomeEmbed] });
});
// =======================================================
  
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// DRY
async function handleOAuthAndGrantRoles(code, redirectUri, rolesToAdd, res) {
    if (!code) {
        return res.send("Error: Authorization code not found. Please try again.");
    }

    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
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
        const userResponse = await fetch('https://discord.com/api/users/@me', { headers: { authorization: `Bearer ${accessToken}` } });
        const user = await userResponse.json();
        const userId = user.id;

        const guild = await client.guilds.fetch(SERVER_ID);
        await guild.members.add(userId, { accessToken });
        
        const member = await guild.members.fetch(userId);
        await member.roles.add(rolesToAdd);
        
        console.log(`User ${userId} processed. Roles granted: ${rolesToAdd.join(', ')}`);

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
}

// ROTA #1: Para Clientes Pagantes
app.get('/callback-customer', async (req, res) => {
    const code = req.query.code;
    const roles = [ALCHEMIST_ROLE_ID, FOUNDER_ROLE_ID];
    await handleOAuthAndGrantRoles(code, REDIRECT_URI_CUSTOMER, roles, res);
});

// ROTA #2: Para Parceiros Afiliados
app.get('/callback-affiliate', async (req, res) => {
    const code = req.query.code;
    const roles = [VANGUARD_ROLE_ID]; // Só o cargo de Vanguarda por este fluxo
    await handleOAuthAndGrantRoles(code, REDIRECT_URI_AFFILIATE, roles, res);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});