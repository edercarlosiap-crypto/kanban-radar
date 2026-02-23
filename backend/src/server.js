require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Backend funcionando na porta ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`${'='.repeat(50)}\n`);
});
