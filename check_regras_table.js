const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

console.log('🔍 Verificando tabela regras_comissao...\n');

db.serialize(() => {
  db.all("PRAGMA table_info(regras_comissao)", [], (err, cols) => {
    if (err) {
      console.error('❌ Erro:', err.message);
      db.close();
      return;
    }
    console.table(cols.map(c => ({ nome: c.name, tipo: c.type })));
    db.close();
  });
});
