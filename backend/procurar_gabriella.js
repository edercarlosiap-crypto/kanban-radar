const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

// Procurar por Gabriella
db.all(`SELECT * FROM colaboradores WHERE LOWER(nome) LIKE '%gabriella%'`, (err, rows) => {
  if(err) {
    console.log('Erro:', err.message);
  } else if(rows && rows.length > 0) {
    console.log('Gabriella encontrada!');
    rows.forEach(r => {
      console.log('ID:', r.id);
      console.log('Nome:', r.nome);
      console.log('Regional ID:', r.regional_id);
    });
  } else {
    console.log('Nenhuma Gabriella encontrada.');
    console.log('\nTodos os colaboradores:');
    
    db.all(`SELECT id, nome, regional_id FROM colaboradores`, (err, all) => {
      if(!err && all) {
        all.forEach(c => {
          console.log(c.nome, '| ID:', c.id, '| Regional:', c.regional_id);
        });
      }
      
      // Procurar por ALTA FLORESTA
      console.log('\n\nProcurando por ALTA FLORESTA em regionais...');
      db.all(`SELECT id, nome FROM regionais WHERE LOWER(nome) LIKE '%alta%'`, (err, regs) => {
        if(!err && regs) {
          regs.forEach(r => console.log('  ', r.nome, '|', r.id));
        }
        
        db.close();
      });
    });
  }
});
