const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const sql = "UPDATE radar SET responsavel = TRIM(responsavel) WHERE responsavel IS NOT NULL AND responsavel != TRIM(responsavel)";

db.run(sql, function (err) {
  if (err) {
    console.error('Erro ao corrigir responsaveis:', err.message);
    db.close();
    process.exit(1);
    return;
  }
  console.log(`Responsaveis corrigidos: ${this.changes}`);
  db.close();
});
