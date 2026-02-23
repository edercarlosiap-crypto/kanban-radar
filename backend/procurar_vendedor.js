const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

// Procurar alguma variação de Gabriella
console.log('Procurando por Gabriella...\n');

db.all('SELECT nome FROM colaboradores WHERE nome LIKE ?', ['%gabriella%'], (err, rows) => {
  if(err) {
    console.log('Erro:', err.message);
  } else {
    if(rows && rows.length > 0) {
      console.log('Encontrados:');
      rows.forEach(r => console.log('  -', r.nome));
    } else {
      console.log('Nenhuma Gabriella encontrada.\n');
      console.log('Todos os colaboradores:');
      db.all('SELECT c.id, c.nome, r.nome as regional FROM colaboradores c LEFT JOIN regionais r ON c.regional_id = r.id', (err2, rows2) => {
        if(rows2) {
          rows2.forEach(r => console.log('  -', r.nome, '|', r.regional));
        }
        db.close();
      });
    }
  }
});
