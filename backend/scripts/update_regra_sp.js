const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

const REGIONAL_SP_ID = 'e78ea0b6-c672-4af9-bac9-87f576d0257d';
const periodo = 'Dez/25';

db.serialize(() => {
  console.log('📊 Atualizando regra de comissão para São Paulo (Dez/25)...\n');
  
  db.run(`
    UPDATE regras_comissao 
    SET 
      meta1Volume = ?,
      meta1Percent = ?,
      meta2Volume = ?,
      meta2Percent = ?,
      meta3Volume = ?,
      meta3Percent = ?,
      incrementoGlobal = ?,
      dataAtualizacao = CURRENT_TIMESTAMP
    WHERE regionalId = ? AND periodo = ?
  `, [
    95.0, 0.05,   // meta1: 95 volume → 5%
    76.0, 0.03,   // meta2: 76 volume → 3%
    61.0, 0.01,   // meta3: 61 volume → 1%
    0.4,          // incremento global: 40%
    REGIONAL_SP_ID, periodo
  ], function(err) {
    if (err) {
      console.error('❌ Erro ao atualizar regra:', err);
    } else if (this.changes === 0) {
      console.log('⚠️  Nenhuma regra encontrada. Resultado:', this.changes);
    } else {
      console.log('✅ Regra atualizada com sucesso!');
      console.log(`   Afetou ${this.changes} linha(s)\n`);
      
      // Verificar resultado
      db.get(`
        SELECT * FROM regras_comissao 
        WHERE regionalId = ? AND periodo = ?
      `, [REGIONAL_SP_ID, periodo], (err, row) => {
        if (err) {
          console.error('❌ Erro:', err);
        } else {
          console.log('📋 Regra atualizada:');
          console.log(JSON.stringify(row, null, 2));
          
          console.log('\n📐 Cálculo das Metas Individuais:');
          console.log('  Total de vendedores na regional: 4');
          console.log(`  Meta Individual 1: (${row.meta1Volume}/4) × 1.4 = ${(row.meta1Volume/4)*1.4} → ${row.meta1Percent*100}%`);
          console.log(`  Meta Individual 2: (${row.meta2Volume}/4) × 1.4 = ${(row.meta2Volume/4)*1.4} → ${row.meta2Percent*100}%`);
          console.log(`  Meta Individual 3: (${row.meta3Volume}/4) × 1.4 = ${(row.meta3Volume/4)*1.4} → ${row.meta3Percent*100}%`);
        }
        db.close();
      });
    }
  });
});
