const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.sqlite');

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
  if (err) {
    console.log('Erro:', err);
  } else {
    console.log('Tabelas existentes:');
    rows.forEach(r => console.log(' -', r.name));
  }
  db.close();
});
