const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('\n=== Buscando 79 vendas em QUALQUER regional/período ===\n');

const db1 = new sqlite3.Database(path.resolve(__dirname, 'database.db'));

db1.all(`
  SELECT regional_id, periodo, SUM(vendas_volume) as total
  FROM vendas_mensais
  GROUP BY regional_id, periodo
  HAVING total BETWEEN 75 AND 85
  ORDER BY periodo, total
`, [], (err, rows) => {
  if (err) {
    console.log('Erro:', err.message);
  } else if (rows.length > 0) {
    console.log('Encontradas regionais com ~79 vendas:');
    console.table(rows);
  } else {
    console.log('❌ Nenhum registro com ~79 vendas encontrado');
  }
  
  db1.all(`
    SELECT regional_id, periodo, churn
    FROM churn_regionais
    WHERE churn BETWEEN 45 AND 55
    ORDER BY periodo, churn
  `, [], (err2, rows2) => {
    if (err2) {
      console.log('Erro churn:', err2.message);
    } else if (rows2.length > 0) {
      console.log('\nEncontradas regionais com ~51 churn:');
      console.table(rows2);
    } else {
      console.log('❌ Nenhum registro com ~51 churn encontrado');
    }
    
    // Listar TODAS as regionais e períodos disponíveis
    db1.all(`
      SELECT DISTINCT periodo, COUNT(*) as registros
      FROM vendas_mensais
      GROUP BY periodo
      ORDER BY periodo
    `, [], (err3, periods) => {
      if (!err3) {
        console.log('\n📅 Períodos disponíveis no banco:');
        console.table(periods);
      }
      
      db1.all(`
        SELECT r.id, r.nome, COUNT(vm.id) as num_vendas_mensais
        FROM regionais r
        LEFT JOIN vendas_mensais vm ON r.id = vm.regional_id
        GROUP BY r.id
        ORDER BY r.nome
      `, [], (err4, regionais) => {
        if (!err4) {
          console.log('\n🏢 Regionais e quantidade de registros:');
          console.table(regionais);
        }
        db1.close();
      });
    });
  });
});
