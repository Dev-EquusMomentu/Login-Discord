const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// --- Bot Configuration ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// Global Ambient Variables
const {
    DISCORD_BOT_TOKEN,
    DISCORD_SERVER_ID,
    DISCORD_ALCHEMIST_ROLE_ID,
    DISCORD_FOUNDER_ROLE_ID,
    DISCORD_VANGUARD_ROLE_ID,
    DISCORD_RECRUIT_ROLE_ID,
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_REDIRECT_URI_CUSTOMER,
    DISCORD_REDIRECT_URI_AFFILIATE,
    DISCORD_REDIRECT_URI_WAITLIST,
    DISCORD_WELCOME_CHANNEL_ID,
    DISCORD_JOURNEY_CHANNEL_ID,
} = process.env;

client.login(DISCORD_BOT_TOKEN);

// =======================================================
// The Praetor Awakens
// =======================================================
client.on('ready', () => {
    console.log(`Bot ${client.user.tag} está online e pronto para comandar!`);
    client.user.setActivity('Commanding the Cavalry', { type: 'PLAYING' });
});

// =======================================================
// The Guard
// =======================================================
client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== DISCORD_SERVER_ID) return;

    try {
        if (DISCORD_RECRUIT_ROLE_ID) {
            await member.roles.add(DISCORD_RECRUIT_ROLE_ID);
        }

        const welcomeChannel = member.guild.channels.cache.get(DISCORD_WELCOME_CHANNEL_ID);
        if (welcomeChannel) {
            const welcomeEmbed = new EmbedBuilder()
                .setColor(0xD4AF37) // Gold
                .setTitle(`A New Warrior Has Entered the Forge!`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .setDescription(`**The Cavalry salutes a new warrior. Welcome, ${member}!**\n\nYou are at the threshold. Find your mission briefing and begin your true journey in <#${DISCORD_JOURNEY_CHANNEL_ID}>.`);
            
            await welcomeChannel.send({ embeds: [welcomeEmbed] });
        }
    } catch (error) {
        console.error(`[GUARDIÃO] Erro ao processar novo membro:`, error);
    }
});

// =======================================================
// Sucess Page Generator
// =======================================================
function getSuccessPage(type) {
    let title, message, buttonText, accentColor;
    
    if (type === 'customer') {
        accentColor = '#D4AF37'; // Gold
        title = "Empire Access Granted.";
        message = "Your <strong>Founder</strong> & <strong>Alchemist</strong> status is active.<br>The Sanctum doors are open. Go meet your network.";
        buttonText = "Enter The Sanctum";
    } else if (type === 'affiliate') {

        accentColor = '#10b981'; // Green Matrix/Tactical
        title = "Clearance Level: Vanguard.";
        message = "Authentication complete. Your <strong>Battle Kit</strong> and strategy guide are waiting in the secured channel.<br>Time to execute.";
        buttonText = "Report to Base";
    } else {
        // Waitlist (GENÉRICO - Atualizado)
        accentColor = '#3b82f6'; // Blue Tech
        title = "Spot Secured.";
        message = "You are officially on the priority list. Your access is locked for the next deployment.<br>Join the holding area to await the signal.";
        buttonText = "Join Holding Area";
    }

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Equus Momentum | Access Granted</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #050505; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; overflow: hidden; }
        
        .container { 
            max-width: 460px; width: 100%; 
            background: rgba(20, 20, 23, 0.8); 
            border: 1px solid #333; 
            border-top: 3px solid ${accentColor};
            border-radius: 12px; 
            padding: 40px 30px; 
            text-align: center; 
            box-shadow: 0 20px 60px -10px rgba(0,0,0,0.7);
            animation: slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        h1 { font-size: 26px; font-weight: 800; margin-bottom: 15px; letter-spacing: -0.5px; }
        p { font-size: 15px; line-height: 1.6; color: #a1a1aa; margin-bottom: 30px; }
        strong { color: #fff; font-weight: 600; }

        .btn { 
            display: inline-block; width: 100%;
            background: ${accentColor}; 
            color: #000; font-weight: 700; 
            text-transform: uppercase; letter-spacing: 1px; font-size: 13px;
            padding: 16px; border-radius: 6px; border: none; 
            text-decoration: none; cursor: pointer; 
            transition: all 0.2s; 
            box-shadow: 0 4px 20px ${accentColor}40;
        }
        .btn:hover { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 8px 25px ${accentColor}60; }
        
        .footer { margin-top: 25px; font-size: 11px; color: #52525b; text-transform: uppercase; letter-spacing: 1px; }

        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="https://discord.com/channels/${DISCORD_SERVER_ID}/${DISCORD_JOURNEY_CHANNEL_ID}" class="btn">${buttonText}</a>
        <div class="footer">Return to Discord to proceed</div>
      </div>
    </body>
    </html>
    `;
}

// =======================================================
// OAUTH System
// =======================================================
app.use(express.static(path.join(__dirname, 'public')));

async function handleOAuthAndGrantRoles(code, redirectUri, rolesToAdd, res, type) {
    if (!code) return res.send("Error: Authorization code not found.");

    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                scope: 'identify guilds.join',
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) throw new Error("Failed to fetch access token.");
        
        const userResponse = await fetch('https://discord.com/api/users/@me', { headers: { authorization: `Bearer ${tokenData.access_token}` } });
        const user = await userResponse.json();
        const guild = await client.guilds.fetch(DISCORD_SERVER_ID);
        
        let member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) member = await guild.members.add(user.id, { accessToken: tokenData.access_token });
        
        await member.roles.remove(DISCORD_RECRUIT_ROLE_ID).catch(() => {});
        await member.roles.add(rolesToAdd);
        
        console.log(`[QG] ${user.username} processado. Tipo: ${type}.`);

        res.send(getSuccessPage(type));

    } catch (error) {
        console.error('[QG] Erro:', error);
        res.status(500).send("System Error. Please report to support.");
    }
}

// --- Routes ---

// 1. Customer (Founder)
app.get('/callback-customer', (req, res) => {
    handleOAuthAndGrantRoles(req.query.code, DISCORD_REDIRECT_URI_CUSTOMER, [DISCORD_ALCHEMIST_ROLE_ID, DISCORD_FOUNDER_ROLE_ID], res, 'customer');
});

// 2. Affiliates (Vanguard)
app.get('/callback-affiliate', (req, res) => {
    handleOAuthAndGrantRoles(req.query.code, DISCORD_REDIRECT_URI_AFFILIATE, [DISCORD_VANGUARD_ROLE_ID], res, 'affiliate');
});

// 3. Waitlist
app.get('/callback-waitlist', (req, res) => {
    handleOAuthAndGrantRoles(req.query.code, DISCORD_REDIRECT_URI_WAITLIST, [DISCORD_WAITLIST_ROLE_ID], res, 'waitlist');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});