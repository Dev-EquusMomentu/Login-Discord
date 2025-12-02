// index.js (Versão do Imperador - Simples e Letal)

const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuração do Bot ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

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
    DISCORD_WELCOME_CHANNEL_ID,
    DISCORD_JOURNEY_CHANNEL_ID,
} = process.env;

client.login(DISCORD_BOT_TOKEN);
// =======================================================
// O DESPERTAR DO PRETOR - DEFINE O STATUS DO BOT
// =======================================================
client.on('ready', () => {
    console.log(`Bot ${client.user.tag} está online e pronto para comandar!`);

    client.user.setActivity('Commanding the Cavalry', { type: 'PLAYING' });
});
// =======================================================

// =======================================================
// O GUARDIÃO DO PORTÃO - ACOLHE TODOS OS RECRUTAS
// =======================================================
client.on('guildMemberAdd', async (member) => {
    // Garante que o evento não foi para um servidor diferente
    if (member.guild.id !== DISCORD_SERVER_ID) return;

    try {
        // 1. Dá o cargo de Recruta
        if (DISCORD_RECRUIT_ROLE_ID) {
            await member.roles.add(DISCORD_RECRUIT_ROLE_ID);
            console.log(`[GUARDIÃO] Cargo de Recruta concedido a ${member.user.tag}.`);
        }

        // 2. Envia a mensagem de boas-vindas
        const welcomeChannel = member.guild.channels.cache.get(DISCORD_WELCOME_CHANNEL_ID);
        if (!welcomeChannel) {
            console.error('[GUARDIÃO] Canal de boas-vindas não encontrado!');
            return;
        }

        const welcomeEmbed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`A New Warrior Has Entered the Forge!`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
            .setDescription(`**The Cavalry salutes a new warrior. Welcome, ${member}!**\n\nYou are at the threshold. Find your mission briefing and begin your true journey in <#${DISCORD_JOURNEY_CHANNEL_ID}>.`);
        
        await welcomeChannel.send({ embeds: [welcomeEmbed] });
        console.log(`[GUARDIÃO] Mensagem de boas-vindas enviada para ${member.user.tag}.`);

    } catch (error) {
        console.error(`[GUARDIÃO] Erro ao processar novo membro ${member.user.tag}:`, error);
    }
});

// =======================================================
// O QUARTEL-GENERAL - PROMOVE SOLDADOS DE ELITE
// =======================================================
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

async function handleOAuthAndGrantRoles(code, redirectUri, rolesToAdd, res) {
    if (!code) {
        return res.send("Error: Authorization code not found.");
    }

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
        if (!tokenData.access_token) throw new Error("Failed to fetch access token from Discord.");
        
        const userResponse = await fetch('https://discord.com/api/users/@me', { headers: { authorization: `Bearer ${tokenData.access_token}` } });
        const user = await userResponse.json();
        const guild = await client.guilds.fetch(DISCORD_SERVER_ID);
        
        // Tenta buscar o membro. Se não existir, o .add() abaixo vai adicioná-lo.
        let member = await guild.members.fetch(user.id).catch(() => null);

        // Se o membro não está no servidor, o adiciona.
        if (!member) {
            member = await guild.members.add(user.id, { accessToken: tokenData.access_token });
            console.log(`[QG] ${user.username} foi adicionado ao servidor.`);
        }
        
        // Remove o cargo de Recruta para evitar redundância e concede os cargos de elite.
        await member.roles.remove(DISCORD_RECRUIT_ROLE_ID);
        await member.roles.add(rolesToAdd);
        
        console.log(`[QG] ${user.username} promovido. Cargos concedidos: ${rolesToAdd.join(', ')}. Cargo de Recruta removido.`);

        res.send(`
            <style>body{font-family:Arial,sans-serif;background:#18181b;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;} .container{max-width:480px;background:#23232a;border-radius:12px;padding:32px;}</style>
            <div class="container">
                <h1>Success! Welcome to the Cavalry.</h1>
                <p>Your elite roles have been granted. You can now close this window and open Discord.</p>
            </div>
        `);
    } catch (error) {
        console.error('[QG] Erro no fluxo de OAuth:', error);
        res.status(500).send("An internal server error occurred.");
    }
}

// ROTA #1: Clientes (Compradores)
app.get('/callback-customer', (req, res) => {
    handleOAuthAndGrantRoles(req.query.code, DISCORD_REDIRECT_URI_CUSTOMER, [DISCORD_ALCHEMIST_ROLE_ID, DISCORD_FOUNDER_ROLE_ID], res);
});

// ROTA #2: Vanguarda (Afiliados)
app.get('/callback-affiliate', (req, res) => {
    handleOAuthAndGrantRoles(req.query.code, DISCORD_REDIRECT_URI_AFFILIATE, [DISCORD_VANGUARD_ROLE_ID], res);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});