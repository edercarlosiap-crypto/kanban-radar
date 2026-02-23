const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database.db');

const regionalId = 'c234022e-9113-4b54-acc2-ab5134c9b0fa';
const periodo = 'Dez/25';

console.log('=== ANÁLISE ALTA FLORESTA DOESTE - DEZ/25 ===\n');

// 1. Ver metas de vendas
console.log('1. Metas de Vendas:');
db.all(
  'SELECT meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, pesoVendasChurn FROM regras_comissao WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = "vendas"',
  [regionalId, periodo],
  (err, rows) => {
    if (err) console.log('Erro:', err);
    else console.log(rows ? rows[0] : 'Nenhuma meta encontrada');
    
    // 2. Ver metas de churn
    console.log('\n2. Metas de Churn:');
    db.all(
      'SELECT meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent FROM regras_comissao WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = "churn"',
      [regionalId, periodo],
      (err, rows) => {
        if (err) console.log('Erro:', err);
        else console.log(rows ? rows[0] : 'Nenhuma meta encontrada');
        
        // 3. Ver vendas realizadas
        console.log('\n3. Vendas Realizadas:');
        db.all(
          'SELECT SUM(vendas_volume) as totalVendas, COUNT(*) as registros FROM vendas_mensais WHERE regional_id = ? AND periodo = ?',
          [regionalId, periodo],
          (err, rows) => {
            if (err) console.log('Erro:', err);
            else console.log(rows ? rows[0] : 'Nenhuma venda encontrada');
            
            // 4. Ver churn realizado
            console.log('\n4. Churn Realizado:');
            db.all(
              'SELECT SUM(churn) as totalChurn FROM churn_regionais WHERE regional_id = ? AND periodo = ?',
              [regionalId, periodo],
              (err, rows) => {
                if (err) console.log('Erro:', err);
                else console.log(rows ? rows[0] : 'Nenhum churn encontrado');
                
                // 5. Ver colaboradores
                console.log('\n5. Vendedores da Regional:');
                db.all(
                  'SELECT id, nome FROM colaboradores WHERE regional_id = ?',
                  [regionalId],
                  (err, rows) => {
                    if (err) console.log('Erro:', err);
                    else {
                      console.log(`Total: ${rows.length} vendedores`);
                      rows.forEach(r => console.log(` - ${r.nome} (${r.id})`));
                    }
                    
                    // 6. Ver todas as regras para esta regional
                    console.log('\n6. Todas as Regras de Comissão:');
                    db.all(
                      'SELECT tipoMeta, periodo, meta1Volume, meta1Percent FROM regras_comissao WHERE regionalId = ? AND periodo = ?',
                      [regionalId, periodo],
                      (err, rows) => {
                        if (err) console.log('Erro:', err);
                        else {
                          rows.forEach(r => console.log(` - ${r.tipoMeta}: meta1Vol=${r.meta1Volume}, meta1P=${r.meta1Percent}%`));
                        }
                        db.close();
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  }
);
