const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

const periodo = 'Dez/25';
const regionalId = 'c234022e-9113-4b54-acc2-ab5134c9b0fa';

db.all(`
  SELECT *
  FROM regras_comissao
  LIMIT 10
`, [], (err, rows) => {
  if (err) {
    console.error('Erro:', err.message);
  } else {
    console.log('\n📊 Regras de comissão para Alta Floresta Doeste - Dez/25:\n');
    console.table(rows);
  }
  db.close();
});
