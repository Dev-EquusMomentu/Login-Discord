const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuração do Bot do Discord ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const SERVER_ID = process.env.DISCORD_SERVER_ID;
const ROLE_ID = process.env.DISCORD_ROLE_ID;

client.login(BOT_TOKEN);

client.on('ready', () => {
  console.log(`Bot ${client.user.tag} está online e pronto!`);
});
// ------------------------------------

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// A nossa rota mágica - VERSÃO 2.0
app.post('/grant-role', async (req, res) => {
  const { discord_user_id } = req.body;

  if (!discord_user_id) {
    return res.status(400).json({ error: 'Discord User ID não fornecido.' });
  }

  // A MUDANÇA ESTÁ AQUI! Pegamos os dois IDs
  const ALCHEMIST_ROLE_ID = process.env.DISCORD_ALCHEMIST_ROLE_ID;
  const FOUNDER_ROLE_ID = process.env.DISCORD_FOUNDER_ROLE_ID;

  if (!ALCHEMIST_ROLE_ID || !FOUNDER_ROLE_ID) {
    console.error('IDs de cargo não configurados nas variáveis de ambiente!');
    return res.status(500).json({ error: 'Erro de configuração do servidor.' });
  }

  try {
    const guild = await client.guilds.fetch(SERVER_ID);
    if (!guild) {
      console.error('Servidor não encontrado!');
      return res.status(500).json({ error: 'Erro interno do servidor.' });
    }

    const member = await guild.members.fetch(discord_user_id);
    if (!member) {
      const invite_link = process.env.DISCORD_INVITE_LINK;
      return res.status(404).json({ 
        error: 'Usuário não encontrado no servidor. Por favor, entre primeiro.',
        inviteLink: invite_link
      });
    }

    // A MÁGICA DE DAR OS DOIS CARGOS
    await member.roles.add([ALCHEMIST_ROLE_ID, FOUNDER_ROLE_ID]);
    
    console.log(`Cargos Alchemist e Founder adicionados para o usuário ${discord_user_id}`);
    
    const invite_link = process.env.DISCORD_INVITE_LINK;
    return res.json({ 
      message: `Acesso liberado! Cargos de Alquimista e Fundador concedidos. Você já pode entrar no QG.`,
      inviteLink: invite_link 
    });

  } catch (error) {
    console.error('Erro ao adicionar cargos:', error);
    return res.status(500).json({ error: 'Ocorreu um erro ao tentar liberar seu acesso. Verifique se o bot tem as permissões corretas.' });
  }
});


app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});