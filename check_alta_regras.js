const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');

const regionalId = '314bf186-8eb3-4104-9c1d-9477bb8c4691';

db.all(
  'SELECT tipoMeta, periodo, COUNT(*) as total FROM regras_comissao WHERE regionalId = ? GROUP BY tipoMeta, periodo',
  [regionalId],
  (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log('=== REGRAS PARA ALTA FLORESTA DOESTE ===');
      console.table(rows);
    }
    db.close();
  }
);
