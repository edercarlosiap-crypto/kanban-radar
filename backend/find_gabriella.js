const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

db.get('SELECT c.id, c.nome, c.regional_id, r.nome as regional_nome FROM colaboradores c LEFT JOIN regionais r ON c.regional_id = r.id WHERE c.nome LIKE ? LIMIT 1', ['%Gabriella%'], (err, row) => {
  if (err) {
    console.log('Erro:', err.message);
  } else if (row) {
    console.log('Encontrado:', row.nome);
    console.log('Regional:', row.regional_nome);
    console.log('ID Regional:', row.regional_id);
  } else {
    console.log('Nenhuma Gabriella encontrada');
  }
  db.close();
});
