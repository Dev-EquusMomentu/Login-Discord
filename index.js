const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());

app.post('/grant-role', async (req, res) => {
  const { email, discord_access_token, discord_user_id } = req.body;
  if (!email || !discord_access_token || !discord_user_id) {
    return res.status(400).json({ error: 'Dados incompletos.' });
  }
  // Aqui você faria a lógica real de dar o cargo usando o bot do Discord
  // Por enquanto, só responde com sucesso (mock)
  return res.json({ message: `Acesso liberado para ${email} (Discord ID: ${discord_user_id})!` });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});