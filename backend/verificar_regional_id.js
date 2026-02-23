const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

const targetRegionalId = "bd402487-06a3-40c3-b206-2fc7bf5d9db4";

// Procurar a regional
db.get(`SELECT * FROM regionais WHERE id = ?`, [targetRegionalId], (err, regional) => {
  if (!regional) {
    console.log('❌ Regional com ID '+ targetRegionalId + ' não encontrada');
    console.log('\n📋 Todas as regionais:');
    
    db.all(`SELECT id, nome FROM regionais`, (err, regs) => {
      if (regs) {
        regs.forEach(r => console.log(`  ${r.nome} | ${r.id}`));
      }
      
      // Agora procurar por colaboradores avec Gabriella
      console.log('\n🔍 Procurando por anybody com "Gabriella" no nome:');
      db.all(`SELECT nome, regional_id FROM colaboradores WHERE nome LIKE '%Gabriella%'`, (err, colabs) => {
        if (colabs && colabs.length > 0) {
          colabs.forEach(c => console.log(`  ${c.nome} | Regional: ${c.regional_id}`));
        } else {
          console.log('  Nenhum "Gabriella" encontrado');
        }
        
        db.close();
      });
    });
  } else {
    console.log('✅ Regional encontrada:', regional.nome, '|', regional.id);
    
    // Procurar colaboradores nessa regional
    db.all(`SELECT id, nome FROM colaboradores WHERE regional_id = ? AND status = 'ativo'`, [targetRegionalId], (err, colabs) => {
      if (colabs) {
        console.log('\nColaboradores ativos nesta regional:');
        colabs.forEach(c => console.log(`  ${c.nome} | ${c.id}`));
      } else {
        console.log('Nenhum colaborador ativo encontrado');
      }
      
      db.close();
    });
  }
});
