const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.all("SELECT * FROM colaboradores", (err, rows) => {
  if (err) {
    console.error('❌ Erro:', err);
  } else {
    console.log('👥 Colaboradores cadastrados:');
    console.log(JSON.stringify(rows, null, 2));
  }
  db.close();
});
