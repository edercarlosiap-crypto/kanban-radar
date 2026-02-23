const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) console.error(err);
  else {
    console.log('Tabelas encontradas:');
    rows.forEach(r => console.log('- ' + r.name));
  }
  db.close();
});
