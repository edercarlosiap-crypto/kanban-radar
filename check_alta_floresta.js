const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('='.repeat(70));
console.log('🔍 Buscando dados para Alta Floresta Doeste - Dez/25');
console.log('='.repeat(70));

// Buscar a regional Alta Floresta Doeste
db.get(
  `SELECT * FROM regionais WHERE LOWER(nome) LIKE '%alta floresta%' OR LOWER(nome) LIKE '%doeste%'`,
  (err, regional) => {
    if (!regional) {
      console.log('\n❌ Regional "Alta Floresta Doeste" não encontrada no banco');
      console.log('\n📍 Regionais disponíveis:');
      
      db.all('SELECT nome, id FROM regionais', (err, regionais) => {
        if (regionais) {
          regionais.forEach((r, i) => {
            console.log(`   ${i + 1}. ${r.nome}`);
            console.log(`      ID: ${r.id}`);
          });
        }
        
        console.log('\n💡 Sugestão: Criar regional "Alta Floresta Doeste" e popular dados para Dez/25');
        db.close();
      });
      return;
    }

    const regionalId = regional.id;
    const periodo = 'Dez/25';

    console.log(`\n✅ Regional encontrada: ${regional.nome}`);
    console.log(`   ID: ${regionalId}\n`);

    // Verificar dados de vendas para Dez/25
    db.get(
      `SELECT COUNT(*) as total_vendedores, SUM(vendas_volume) as total_volume, SUM(vendas_financeiro) as total_financeiro
       FROM vendas_mensais
       WHERE regional_id = ? AND periodo = ?`,
      [regionalId, periodo],
      (err, vendas) => {
        const hasVendas = vendas && vendas.total_vendedores > 0;
        
        console.log(`📈 Dados de Vendas (${periodo}):`);
        if (hasVendas) {
          console.log(`   Vendedores: ${vendas.total_vendedores}`);
          console.log(`   Total volume: ${vendas.total_volume} unidades`);
          console.log(`   Total financeiro: R$ ${parseFloat(vendas.total_financeiro || 0).toFixed(2)}`);
        } else {
          console.log(`   ❌ Sem dados de vendas para ${periodo}`);
        }

        // Verificar dados de churn
        db.get(
          `SELECT SUM(churn) as total_churn FROM churn_regionais
           WHERE regional_id = ? AND periodo = ?`,
          [regionalId, periodo],
          (err, churn) => {
            const hasChurn = churn && churn.total_churn !== null;
            
            console.log(`\n⚠️  Dados de Churn (${periodo}):`);
            if (hasChurn) {
              console.log(`   Total churn: ${churn.total_churn}`);
            } else {
              console.log(`   ❌ Sem dados de churn para ${periodo}`);
            }

            // Verificar regras de comissão
            db.all(
              `SELECT * FROM regras_comissao WHERE regionalId = ?`,
              [regionalId],
              (err, regras) => {
                console.log(`\n📋 Regras de Comissão:`);
                if (regras && regras.length > 0) {
                  console.log(`   Total de regras: ${regras.length}`);
                  regras.forEach(r => {
                    console.log(`   - ${r.tipoMeta}`);
                  });
                } else {
                  console.log(`   ❌ Sem regras de comissão`);
                }

                // Status geral
                console.log('\n' + '='.repeat(70));
                console.log('📊 STATUS GERAL:');
                console.log('='.repeat(70));
                
                if (hasVendas && hasChurn && regras && regras.length > 0) {
                  console.log('\n✅ Todos os dados disponíveis! Pode fazer análise completa.');
                } else {
                  console.log('\n⚠️  Dados incompletos:');
                  if (!hasVendas) console.log('   • Faltam dados de vendas');
                  if (!hasChurn) console.log('   • Faltam dados de churn');
                  if (!regras || regras.length === 0) console.log('   • Faltam regras de comissão');
                  
                  console.log('\n💡 Para completar:');
                  if (!hasVendas) console.log(`   1. Inserir vendas para ${periodo}`);
                  if (!hasChurn) console.log(`   2. Inserir churn para ${periodo}`);
                  if (!regras || regras.length === 0) console.log('   3. Configurar regras de comissão');
                }

                console.log('\n' + '='.repeat(70) + '\n');
                db.close();
              }
            );
          }
        );
      }
    );
  }
);
