const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');

// Buscar onde temos 36 renovações
db.all(
  `SELECT vm.regional_id, r.nome as regional_nome, SUM(vm.renovacao_volume) as volume, SUM(vm.renovacao_financeiro) as financeiro, COUNT(DISTINCT vm.vendedor_id) as num_vendedores
   FROM vendas_mensais vm
   JOIN regionais r ON r.id = vm.regional_id
   WHERE vm.periodo = 'Dez/25' AND vm.renovacao_volume > 0
   GROUP BY vm.regional_id
   ORDER BY volume ASC`,
  [],
  (err, dados) => {
    if (err) {
      console.error('Erro:', err);
      db.close();
      return;
    }
    
    console.log('=== RENOVAÇÕES POR REGIONAL - Dez/25 ===');
    if (dados && dados.length > 0) {
      dados.forEach(d => {
        console.log(`\nRegional: ${d.regional_nome}`);
        console.log(`  ID: ${d.regional_id}`);
        console.log(`  Volume: ${d.volume} unidades`);
        console.log(`  Financeiro: R$ ${d.financeiro}`);
        console.log(`  Vendedores: ${d.num_vendedores}`);
      });
      
      // Buscar regional com exatamente 36
      const regional36 = dados.find(d => d.volume === 36);
      if (regional36) {
        console.log('\n\n🎯 REGIONAL COM 36 RENOVAÇÕES ENCONTRADA:');
        console.log(`Regional: ${regional36.regional_nome}`);
        console.log(`ID: ${regional36.regional_id}`);
        
        // Buscar vendedores dessa regional
        db.all(
          `SELECT u.nome, vm.renovacao_volume as volume, vm.renovacao_financeiro as financeiro
           FROM vendas_mensais vm
           JOIN usuarios u ON u.id = vm.vendedor_id
           WHERE vm.regional_id = ? AND vm.periodo = 'Dez/25' AND vm.renovacao_volume > 0`,
          [regional36.regional_id],
          (err2, vendedores) => {
            if (err2) {
              console.error('Erro:', err2);
            } else {
              console.log('\nVendedores:');
              vendedores.forEach(v => {
                console.log(`  ${v.nome}: ${v.volume} unidades = R$ ${v.financeiro}`);
              });
            }
            db.close();
          }
        );
      } else {
        console.log('\n\n❌ Nenhuma regional com exatamente 36 renovações encontrada');
        db.close();
      }
    } else {
      console.log('Nenhum dado encontrado');
      db.close();
    }
  }
);
