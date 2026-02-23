const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

const query = `SELECT rc.*, r.nome as regionalNome FROM regras_comissao rc LEFT JOIN regionais r ON rc.regionalId = r.id ORDER BY rc.dataCriacao DESC LIMIT 3`;

db.all(query, (err, rows) => {
  if(err) {
    console.error('Erro:', err);
  } else {
    console.log('Total de linhas retornadas:', rows.length);
    if(rows.length > 0) {
      console.log('Primeira linha:');
      console.log(JSON.stringify(rows[0], null, 2));
    }
  }
  db.close();
});
