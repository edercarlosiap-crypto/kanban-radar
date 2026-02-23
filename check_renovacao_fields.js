const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

console.log('🔍 Verificando campos de metas individuais para RENOVAÇÃO\n');

db.all(`
  SELECT 
    tipoMeta,
    meta1Volume, meta1Percent, meta1PercentIndividual,
    meta2Volume, meta2Percent, meta2PercentIndividual,
    meta3Volume, meta3Percent, meta3PercentIndividual
  FROM regras_comissao 
  WHERE LOWER(tipoMeta) IN ('renovação', 'vendas') 
    AND periodo = 'Dez/25'
  LIMIT 5
`, [], (err, rows) => {
  if (err) {
    console.error('❌ Erro:', err.message);
  } else {
    console.table(rows);
  }
  db.close();
});
