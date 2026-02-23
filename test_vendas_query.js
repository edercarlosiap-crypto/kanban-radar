const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');

const query = 'SELECT * FROM regras_comissao WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = ?';
const params = ['314bf186-8eb3-4104-9c1d-9477bb8c4691', 'Dez/25', 'vendas'];

db.get(query, params, (err, row) => {
  if (err) {
    console.error('Erro:', err);
  } else if (row) {
    console.log('✅ Regra de vendas encontrada:');
    console.log(JSON.stringify(row, null, 2));
  } else {
    console.log('❌ Regra de vendas NÃO encontrada com a query do backend');
    
    // Testar sem LOWER
    db.get('SELECT * FROM regras_comissao WHERE regionalId = ? AND periodo = ? AND tipoMeta = ?', ['314bf186-8eb3-4104-9c1d-9477bb8c4691', 'Dez/25', 'Vendas'], (err2, row2) => {
      if (row2) {
        console.log('\n✅ MAS encontrada COM V maiúsculo:');
        console.log(JSON.stringify(row2, null, 2));
      }
      db.close();
    });
  }
});
