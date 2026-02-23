const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

// Verificar tabelas
db.all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`, (err, rows) => {
  if(err) {
    console.log('Erro:', err.message);
    db.close();
    return;
  }
  
  console.log('Tabelas no banco COMISSIONAMENTO:');
  rows.forEach(r => console.log('  -', r.name));
  
  // Agora procurar por Gabriella em cada tabela
  console.log('\n\nProcurando por "Gabriella"...\n');
  
  // Primeiro vamos procurar em vendas_mensais
  db.all(`SELECT * FROM vendas_mensais WHERE periodo = 'Dez/25' LIMIT 3`, (err, vendas) => {
    if(!err && vendas) {
      console.log('Amostra de vendas_mensais:');
      vendas.forEach(v => console.log('  vendedor_id:', v.vendedor_id, '| regional_id:', v.regional_id));
    }
    
    // Procurar em colaboradores
    db.all(`SELECT * FROM colaboradores LIMIT 3`, (err, colab) => {
      if(!err && colab) {
        console.log('\nAmostra de colaboradores:');
        colab.forEach(c => console.log('  id:', c.id, '| nome:', c.nome, '| regional_id:', c.regional_id));
      } else if(err) {
        console.log('\nTabela colaboradores não encontrada ou vazia');
      }
      
      // Tentar fazer um PRAGMA table_info para ver colunas
      db.all(`PRAGMA table_info(vendas_mensais)`, (err, cols) => {
        if(!err && cols) {
          console.log('\nColunas de vendas_mensais:');
          cols.forEach(c => console.log('  -', c.name, '(' + c.type + ')'));
        }
        
        db.close();
      });
    });
  });
});
