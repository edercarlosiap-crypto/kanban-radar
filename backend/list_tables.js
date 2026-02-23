const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
  if(err) {
    console.error('Erro:', err);
  } else {
    console.log('Tabelas encontradas:');
    if(rows && rows.length > 0) {
      rows.forEach(r => console.log('  -', r.name));
    } else {
      console.log('  (nenhuma)');
    }
  }
  db.close();
});
