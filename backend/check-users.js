const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

db.all("SELECT id, nome, email, role FROM usuarios", (err, rows) => {
  if (err) {
    console.error('Erro:', err);
  } else {
    console.log('Usuários no banco:');
    console.table(rows);
  }
  
  db.close();
});
