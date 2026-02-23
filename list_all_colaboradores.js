const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');

// Buscar todos os nomes únicos de colaboradores
db.all("SELECT nome, COUNT(*) as total FROM colaboradores GROUP BY nome ORDER BY nome", [], (err, all) => {
  if (err) {
    console.error(err);
  } else {
    console.log('=== TODOS OS COLABORADORES ===');
    all.forEach(c => console.log(`${c.nome} (${c.total} registros)`));
  }
  db.close();
});
