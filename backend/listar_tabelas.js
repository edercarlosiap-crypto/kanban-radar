const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

// Verificar tabelas
db.all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`, (err, rows) => {
  if(err) {
    console.log('Erro:', err.message);
  } else {
    console.log('Tabelas disponíveis no KANBAN:');
    rows.forEach(r => console.log('  -', r.name));
  }
  db.close();
});
