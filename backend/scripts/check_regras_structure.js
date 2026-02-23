const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.all("PRAGMA table_info(regras_comissao)", [], (err, columns) => {
  if (err) {
    console.error('❌ Erro:', err);
  } else {
    console.log('📋 Estrutura da tabela regras_comissao:');
    console.table(columns);
  }
  
  db.all("SELECT * FROM regras_comissao LIMIT 2", [], (err, rows) => {
    if (err) {
      console.error('❌ Erro:', err);
    } else {
      console.log('\n📊 Exemplos de regras existentes:');
      console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
  });
});
