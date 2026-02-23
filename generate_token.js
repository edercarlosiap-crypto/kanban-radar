const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();

// Primeiro, obter um usuário válido
const db = new sqlite3.Database('./database.db');

db.get('SELECT id FROM usuarios LIMIT 1', (err, row) => {
  if (err || !row) {
    console.error('❌ Nenhum usuário encontrado');
    db.close();
    process.exit(1);
  }

  const usuarioId = row.id;
  const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_123';
  
  // Gerar token
  const token = jwt.sign(
    { usuarioId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log('✅ Token gerado com sucesso:');
  console.log('');
  console.log(token);
  console.log('');
  console.log('Usuário ID:', usuarioId);
  
  db.close();
});
