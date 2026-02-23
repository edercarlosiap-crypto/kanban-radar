const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');

db.all(
  "SELECT u.nome, vm.renovacao_volume, vm.renovacao_financeiro FROM vendas_mensais vm JOIN usuarios u ON u.id = vm.vendedor_id WHERE vm.regional_id = '314bf186-8eb3-4104-9c1d-9477bb8c4691' AND vm.periodo = 'Dez/25' AND vm.renovacao_volume > 0",
  [],
  (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log('=== VENDEDORES COM RENOVAÇÃO - Alta Floresta Doeste ===');
      rows.forEach(r => {
        console.log(`${r.nome}: ${r.renovacao_volume} unidades = R$ ${r.renovacao_financeiro}`);
        
        if (r.renovacao_volume === 36) {
          console.log(`  ✅ Este vendedor tem 36 renovações!`);
          console.log(`  Comissão individual esperada: R$ ${r.renovacao_financeiro} × 1% = R$ ${(r.renovacao_financeiro * 0.01).toFixed(2)}`);
        }
      });
    }
    db.close();
  }
);
