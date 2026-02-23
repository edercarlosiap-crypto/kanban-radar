// ===================================================================
// SERVIDOR PRINCIPAL
// ===================================================================
// Inicia o servidor Express na porta definida

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Radar Estratégico PRO - Backend     ║
║   Servidor iniciado com sucesso      ║
║   Porta: ${PORT}                           ║
║   Acesse: http://localhost:${PORT}      ║
╚════════════════════════════════════════╝
  `);
});
