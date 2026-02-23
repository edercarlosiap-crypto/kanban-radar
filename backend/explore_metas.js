const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.all(`
  SELECT DISTINCT tipoMeta, COUNT(*) as total
  FROM regras_comissao 
  WHERE periodo = 'Dez/25'
  GROUP BY tipoMeta
  ORDER BY tipoMeta
`, [], (err, rows) => {
  if(err) {
    console.log('Erro:', err);
  } else {
    console.log('\n=== TIPOS DE META EM DEZ/25 ===\n');
    console.table(rows);
  }
  
  // Também buscar um exemplo de regra para entender a estrutura
  db.all(`
    SELECT * FROM regras_comissao 
    WHERE periodo = 'Dez/25'
    LIMIT 1
  `, [], (err, rows) => {
    if(!err && rows.length > 0) {
      console.log('\n=== EXEMPLO DE ESTRUTURA DE REGRA ===\n');
      console.log(JSON.stringify(rows[0], null, 2));
    }
    db.close();
  });
});
