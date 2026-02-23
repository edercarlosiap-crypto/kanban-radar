const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

db.all(`
  SELECT 
    c.id, 
    c.nome, 
    c.regional_id, 
    r.nome as regional_nome 
  FROM colaboradores c 
  LEFT JOIN regionais r ON r.id = c.regional_id 
  WHERE c.nome = 'Vendedor Padrão' 
  ORDER BY r.nome
`, (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('=== VENDEDORES PADRÃO POR REGIONAL ===');
  console.table(rows);
  db.close();
});
