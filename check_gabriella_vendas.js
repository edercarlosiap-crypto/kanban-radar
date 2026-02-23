const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.db');

db.all(`
  SELECT v.*, c.nome 
  FROM vendas_mensais v 
  JOIN colaboradores c ON v.vendedor_id = c.id 
  WHERE c.nome = 'Gabriella Gobatto'
`, (err, rows) => {
  if(err) console.error(err);
  else {
    console.log('vendas encontradas:', rows.length);
    console.table(rows);
  }
  db.close();
});
