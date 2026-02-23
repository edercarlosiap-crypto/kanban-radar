const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.db');

const regionalId = '314bf186-8eb3-4104-9c1d-9477bb8c4691';

db.all(`
  SELECT * FROM regras_comissao 
  WHERE regionalId = ? AND periodo = 'Dez/25'
`, [regionalId], (err, rows) => {
  if(err) console.error(err);
  else {
    console.log('Regras encontradas:', rows.length);
    rows.forEach(r => {
      console.log('  ', r.tipoMeta, '| Meta1:', r.meta1Volume);
    });
  }
  db.close();
});
