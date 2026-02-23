const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.sqlite');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) {
    console.log('Erro:', err);
  } else {
    console.log('Tabelas encontradas:');
    rows.forEach(row => console.log('  - ' + row.name));
  }
  db.close();
});
