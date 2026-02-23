const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

db.all('SELECT * FROM usuarios LIMIT 5', [], (err, rows) => {
  if (err) {
    console.error('Erro:', err.message);
  } else {
    console.log('Usuários no banco:');
    console.table(rows);
  }
  db.close();
});
