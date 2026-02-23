const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');

// Buscar detalhes por vendedor de renovação
db.all(
  `SELECT u.nome, SUM(vm.renovacao_volume) as volume, SUM(vm.renovacao_financeiro) as financeiro
   FROM vendas_mensais vm
   JOIN usuarios u ON u.id = vm.vendedor_id
   WHERE vm.regional_id = '314bf186-8eb3-4104-9c1d-9477bb8c4691' AND vm.periodo = 'Dez/25'
   GROUP BY vm.vendedor_id
   ORDER BY vm.vendedor_id`,
  [],
  (err, dados) => {
    if (err) {
      console.error('Erro:', err);
      db.close();
      return;
    }
    
    console.log('=== RENOVAÇÕES POR VENDEDOR - Alta Floresta Doeste - Dez/25 ===');
    if (dados && dados.length > 0) {
      let totalVolume = 0;
      let totalFinanceiro = 0;
      
      dados.forEach(d => {
        console.log(`${d.nome}: ${d.volume} unidades = R$ ${d.financeiro}`);
        totalVolume += d.volume || 0;
        totalFinanceiro += d.financeiro || 0;
      });
      
      console.log(`\nTOTAL REGIONAL: ${totalVolume} unidades = R$ ${totalFinanceiro}`);
      
      // Verificar se existe "Padrão"
      const padraoFound = dados.find(d => d.nome && d.nome.toLowerCase().includes('padr'));
      if (padraoFound) {
        console.log(`\n✅ VENDEDOR PADRÃO ENCONTRADO:`);
        console.log(`   ${padraoFound.volume} unidades = R$ ${padraoFound.financeiro}`);
        console.log(`   Comissão esperada: ${padraoFound.financeiro} × 1% = R$ ${(padraoFound.financeiro * 0.01).toFixed(2)}`);
      } else {
        console.log('\n❌ Vendedor "Padrão" não encontrado nesta regional');
      }
    } else {
      console.log('Nenhum dado encontrado para esta regional');
    }
    
    db.close();
  }
);
