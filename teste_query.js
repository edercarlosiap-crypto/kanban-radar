const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

const periodo = 'Jan/25';
const regionalComDados = '090c6426-8d34-429d-a42e-fbba953dca21';

console.log('Testando query de vendedores...\n');

db.all(
  `SELECT c.id, c.nome, vm.vendas_volume, vm.vendas_financeiro, vm.percentual_alcancado
   FROM colaboradores c
   LEFT JOIN vendas_mensais vm ON c.id = vm.vendedor_id AND vm.periodo = ?
   WHERE c.regional_id = ? AND c.status = 'ativo' AND vm.vendas_financeiro > 0`,
  [periodo, regionalComDados],
  (err, resultado) => {
    if (err) {
      console.error('Erro:', err);
    } else {
      console.log(`Resultados: ${resultado?.length || 0}`);
      if (resultado && resultado.length > 0) {
        resultado.forEach(r => {
          console.log(`  - ${r.nome}: R$ ${r.vendas_financeiro}`);
        });
      } else {
        console.log('⚠️ Nenhum resultado. Testando query alternativa...\n');

        db.all(
          `SELECT c.id, c.nome, vm.vendedor_id, vm.vendas_volume, vm.vendas_financeiro
           FROM colaboradores c, vendas_mensais vm
           WHERE c.id = vm.vendedor_id AND c.regional_id = ? AND vm.periodo = ? AND vm.vendas_financeiro > 0`,
          [regionalComDados, periodo],
          (err, resultado2) => {
            console.log(`Resultados alternativos: ${resultado2?.length || 0}`);
            if (resultado2 && resultado2.length > 0) {
              resultado2.forEach(r => {
                console.log(`  - ${r.nome}: R$ ${r.vendas_financeiro}`);
              });
            }
            db.close();
          }
        );
      }
    }
  }
);
