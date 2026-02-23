const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');

// Listar todas as tabelas
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('Erro:', err);
    db.close();
    return;
  }
  
  console.log('=== TABELAS NO BANCO ===');
  if (tables) {
    tables.forEach(t => console.log(t.name));
  }
  db.close();
});
