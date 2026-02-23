const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

db.all(`PRAGMA table_info(regras_comissao)`, [], (err, rows) => {
  if (err) {
    console.error('Erro:', err.message);
  } else {
    console.log('\n📋 Estrutura da tabela regras_comissao:\n');
    console.table(rows);
  }
  db.close();
});
