const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('='.repeat(70));
console.log('🔍 DEBUG - Verificando dados no banco');
console.log('='.repeat(70));

// 1. Listar regionais
db.all('SELECT id, nome FROM regionais LIMIT 5', (err, regionais) => {
  console.log('\n📍 REGIONAIS:');
  if (regionais) {
    regionais.forEach(r => console.log(`   ${r.nome}: ${r.id}`));
  }

  // 2. Listar colaboradores
  db.all('SELECT id, nome, regional_id FROM colaboradores', (err, colabs) => {
    console.log(`\n👥 COLABORADORES (${colabs?.length || 0}):`);
    if (colabs) {
      colabs.forEach(c => console.log(`   ${c.nome}: regional=${c.regional_id}`));
    }

    // 3. Listar vendas
    db.all(
      'SELECT v.vendedor_id, c.nome, v.regional_id, v.vendas_volume, v.vendas_financeiro, v.periodo FROM vendas_mensais v LEFT JOIN colaboradores c ON v.vendedor_id = c.id',
      (err, vendas) => {
        console.log(`\n💰 VENDAS (${vendas?.length || 0}):`);
        if (vendas && vendas.length > 0) {
          vendas.forEach(v => {
            console.log(`   ${v.nome}: ${v.vendas_volume} un / R$ ${v.vendas_financeiro} (regional=${v.regional_id?.substring(0, 8)}... período=${v.periodo})`);
          });
        } else {
          console.log('   ❌ Nenhuma venda encontrada');
        }

        // 4. Checar conflito de IDs
        console.log('\n⚠️  DIAGNÓSTICO:');
        if (regionais && colabs && vendas) {
          const regionalSP = regionais[0];
          const colabsSP = colabs.filter(c => c.regional_id === regionalSP.id);
          console.log(`   Regional SP: ${regionalSP.id}`);
          console.log(`   Colaboradores SP: ${colabsSP.length}`);
          
          if (vendas.length > 0) {
            const vendaSP = vendas[0];
            console.log(`   Regional da venda: ${vendaSP.regional_id}`);
            console.log(`   Correspondência: ${vendaSP.regional_id === regionalSP.id ? '✓' : '✗'}`);
          }
        }

        db.close();
      }
    );
  });
});
