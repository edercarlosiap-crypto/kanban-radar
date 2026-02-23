const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

const regionalId = 'c187019b-956d-486a-b547-b9ce7a997e98';

console.log('Teste 1: Query usada no código:');
db.get(`
  SELECT 
    meta1Volume, meta1Percent,
    meta2Volume, meta2Percent,
    meta3Volume, meta3Percent,
    incrementoGlobal,
    pesoVendasChurn
  FROM regras_comissao
  WHERE regionalId = ? AND LOWER(tipoMeta) = 'vendas'
  LIMIT 1
`, [regionalId], (err, row) => {
  if (err) {
    console.error('Erro:', err.message);
  } else {
    console.log('Resultado:', row);
  }
  
  console.log('\nTeste 2: Query simplificada:');
  db.get(`
    SELECT * FROM regras_comissao
    WHERE regionalId = ?
  `, [regionalId], (err2, row2) => {
    if (err2) {
      console.error('Erro:', err2.message);
    } else {
      console.log('Resultado:', row2);
    }
    
    console.log('\nTeste 3: Verificar tipoMeta exato:');
    db.all(`
      SELECT tipoMeta, LOWER(tipoMeta) as lower_tipo
      FROM regras_comissao
      WHERE regionalId = ?
    `, [regionalId], (err3, rows3) => {
      if (err3) {
        console.error('Erro:', err3.message);
      } else {
        console.table(rows3);
      }
      db.close();
    });
  });
});
