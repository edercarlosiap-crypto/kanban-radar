const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('\n📋 ESTRUTURA DAS TABELAS:\n');

// Verificar estrutura da tabela colaboradores
db.all("PRAGMA table_info(colaboradores)", [], (err, cols) => {
  if (err) {
    console.error('Erro:', err.message);
  } else {
    console.log('TABELA: colaboradores');
    cols.forEach(c => console.log(`  - ${c.name}: ${c.type}`));
  }
  
  // Verificar estrutura da tabela vendas_mensais
  db.all("PRAGMA table_info(vendas_mensais)", [], (err, cols) => {
    if (err) {
      console.error('Erro:', err.message);
    } else {
      console.log('\nTABELA: vendas_mensais');
      cols.forEach(c => console.log(`  - ${c.name}: ${c.type}`));
    }
    db.close();
  });
});
