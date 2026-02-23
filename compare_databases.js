const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('\n=== BANCO 1: Raiz do projeto ===');
const db1 = new sqlite3.Database(path.resolve(__dirname, 'database.db'));

db1.all(`
  SELECT SUM(vendas_volume) as total 
  FROM vendas_mensais 
  WHERE regional_id = 'c187019b-956d-486a-b547-b9ce7a997e98' AND periodo = 'Dez/25'
`, [], (err, rows) => {
  if (err) {
    console.log('Erro:', err.message);
  } else {
    console.log('Total vendas Dez/25 (Alta Floresta):', rows[0]?.total || 0);
  }
  
  db1.get(`
    SELECT churn 
    FROM churn_regionais 
    WHERE regional_id = 'c187019b-956d-486a-b547-b9ce7a997e98' AND periodo = 'Dez/25'
  `, [], (err2, row) => {
    if (err2) {
      console.log('Erro churn:', err2.message);
    } else {
      console.log('Churn Dez/25 (Alta Floresta):', row?.churn || 0);
    }
    db1.close();
    
    console.log('\n=== BANCO 2: Backend/database.db ===');
    const db2 = new sqlite3.Database(path.resolve(__dirname, 'backend/database.db'));
    
    db2.all(`
      SELECT SUM(vendas_volume) as total 
      FROM vendas_mensais 
      WHERE regional_id = 'c187019b-956d-486a-b547-b9ce7a997e98' AND periodo = 'Dez/25'
    `, [], (err3, rows2) => {
      if (err3) {
        console.log('Erro:', err3.message);
      } else {
        console.log('Total vendas Dez/25 (Alta Floresta):', rows2[0]?.total || 0);
      }
      
      db2.get(`
        SELECT churn 
        FROM churn_regionais 
        WHERE regional_id = 'c187019b-956d-486a-b547-b9ce7a997e98' AND periodo = 'Dez/25'
      `, [], (err4, row2) => {
        if (err4) {
          console.log('Erro churn:', err4.message);
        } else {
          console.log('Churn Dez/25 (Alta Floresta):', row2?.churn || 0);
        }
        db2.close();
      });
    });
  });
});
