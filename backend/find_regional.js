const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

db.all(`
  SELECT id, nome 
  FROM regionais 
  WHERE LOWER(nome) LIKE '%alta floresta%'
`, [], (err, rows) => {
  if (err) {
    console.error('Erro:', err.message);
  } else {
    console.log('\n📍 Regionais com "Alta Floresta" no nome:\n');
    console.table(rows);
    
    if (rows.length > 0) {
      const regionalId = rows[0].id;
      console.log(`\n🔍 Buscando regras para regionalId: ${regionalId}\n`);
      
      db.all(`
        SELECT *
        FROM regras_comissao
        WHERE regionalId = ?
      `, [regionalId], (err2, regras) => {
        if (err2) {
          console.error('Erro ao buscar regras:', err2.message);
        } else {
          console.table(regras);
        }
        db.close();
      });
    } else {
      console.log('❌ Nenhuma regional encontrada com esse nome');
      db.close();
    }
  }
});
