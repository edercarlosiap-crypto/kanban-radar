const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.get('SELECT id, nome, email FROM usuarios LIMIT 1', (err, row) => {
  if (err) console.error(err);
  else {
    console.log('Usuario encontrado:');
    console.log('  ID: ' + row.id);
    console.log('  Nome: ' + row.nome);
    console.log('  Email: ' + row.email);
  }
  db.close();
});
