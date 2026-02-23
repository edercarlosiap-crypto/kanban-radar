const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Listar tabelas
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
  if (err) {
    console.error('Erro:', err);
  } else {
    console.log('Tabelas encontradas:');
    rows.forEach(row => console.log('-', row.name));
  }
  
  // Verificar usuários
  db.all('SELECT id, nome, email, perfil, status FROM usuarios', [], (err2, users) => {
    if (err2) {
      console.error('Erro ao buscar usuários:', err2.message);
    } else {
      console.log('\nUsuários cadastrados:', users.length);
      users.forEach(u => console.log(`- ${u.nome} (${u.email}) - Perfil: ${u.perfil} - Status: ${u.status}`));
    }
    db.close();
  });
});
