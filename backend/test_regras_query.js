const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('\n=== TESTE QUERY REGRAS ===\n');

db.all(
  `SELECT rc.*, r.nome as regionalNome 
   FROM regras_comissao rc 
   LEFT JOIN regionais r ON rc.regionalId = r.id 
   ORDER BY rc.dataCriacao DESC`,
  (err, rows) => {
    if (err) {
      console.log('❌ Erro:', err.message);
    } else {
      console.log('✓ Total de regras:', rows.length);
      
      if (rows.length > 0) {
        console.log('\n📋 Primeiras 3 regras:');
        rows.slice(0, 3).forEach((r, i) => {
          console.log(`${i + 1}. ID: ${r.id}`);
          console.log(`   Regional: ${r.regionalId} (Nome: ${r.regionalNome || 'SEM REGIONAL'})`);
          console.log(`   Tipo Meta: ${r.tipoMeta}, Período: ${r.periodo}`);
        });
      }
    }
    
    db.close();
  }
);
