const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database.db');

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
  if (rows && rows.length) {
    console.log('Tabelas encontradas:');
    rows.forEach(r => console.log(' -', r.name));
  } else {
    console.log('Nenhuma tabela no banco');
  }
  db.close();
});
