const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

// Buscar todos os colaboradores com seu status
console.log('Todos os colaboradores (incluindo status):');
db.all(`SELECT id, nome, status, regional_id FROM colaboradores`, (err, rows) => {
  if(err) {
    console.log('Erro:', err.message);
  } else if(rows) {
    rows.forEach(r => {
      console.log(`  ${r.nome} | Status: ${r.status} | Regional: ${r.regional_id}`);
    });
  }
  
  // Contar quantos com status 'ativo' por regional
  console.log('\n\nContagem por regional (apenas ativos):');
  db.all(`
    SELECT regional_id, COUNT(*) as total 
    FROM colaboradores 
    WHERE status = 'ativo' 
    GROUP BY regional_id
  `, (err, rows) => {
    if(rows) {
      rows.forEach(r => console.log(`  Regional ${r.regional_id}: ${r.total} ativos`));
    }
    
    // Listar regionais
    console.log('\n\nTodas as regionais:');
    db.all(`SELECT id, nome FROM regionais ORDER BY nome`, (err, rows) => {
      if(rows) {
        rows.forEach(r => console.log(`  ${r.nome} | ${r.id}`));
      }
      
      db.close();
    });
  });
});
