const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

const regionalId = 'c187019b-956d-486a-b547-b9ce7a997e98';
const periodo = 'Dez/25';

console.log('\n📊 Buscando vendas mensais para Alta Floresta Doeste - Dez/25:\n');

db.all(`
  SELECT *
  FROM vendas_mensais
  WHERE regional_id = ? AND periodo = ?
`, [regionalId, periodo], (err, vendas) => {
  if (err) {
    console.error('Erro vendas_mensais:', err.message);
  } else {
    console.log('Vendas mensais encontradas:', vendas.length);
    if (vendas.length > 0) {
      const totalVendas = vendas.reduce((sum, v) => sum + (v.vendas_volume || 0), 0);
      console.log('Total vendas_volume:', totalVendas);
      console.table(vendas.slice(0, 5)); // Mostra primeiras 5
    } else {
      console.log('Nenhuma venda encontrada');
    }
  }
  
  console.log('\n📊 Buscando churn para Alta Floresta Doeste - Dez/25:\n');
  
  db.get(`
    SELECT *
    FROM churn_regionais
    WHERE regional_id = ? AND periodo = ?
  `, [regionalId, periodo], (err2, churn) => {
    if (err2) {
      console.error('Erro churn_regionais:', err2.message);
    } else if (churn) {
      console.log('Churn encontrado:', churn.churn);
      console.table([churn]);
    } else {
      console.log('Nenhum churn encontrado');
    }
    
    db.close();
  });
});
