const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('='.repeat(70));
console.log('📊 ANÁLISE DE DADOS REAIS - COMISSIONAMENTO');
console.log('='.repeat(70));

// Função para normalizar percentual para 0-1
function normalizarPercentual(valor) {
  if (valor === null || valor === undefined) return 0;
  const parsed = parseFloat(valor);
  if (isNaN(parsed)) return 0;
  return parsed > 1 ? parsed / 100 : parsed;
}

// Buscar a primeira regional
db.get('SELECT * FROM regionais LIMIT 1', (err, regional) => {
  if (!regional) {
    console.log('❌ Nenhuma regional encontrada');
    db.close();
    return;
  }

  const regionalId = regional.id;
  console.log(`\n🗺️  REGIONAL: ${regional.nome}`);
  console.log(`   ID: ${regionalId}\n`);

  const periodo = 'Jan/25';

  // 1. Verificar se há regras de comissão
  db.all('SELECT * FROM regras_comissao WHERE regionalId = ?', [regionalId], (err, regras) => {
    
    if (!regras || regras.length === 0) {
      console.log('⚠️  Sem regras de comissão cadastradas. Inserindo regras padrão...\n');
      
      // Inserir regras padrão
      const regrasParaInserir = [
        {
          regionalId,
          tipoMeta: 'Vendas',
          meta1Volume: 100,
          meta1Percent: 10,
          meta2Volume: 75,
          meta2Percent: 7,
          meta3Volume: 50,
          meta3Percent: 5,
          pesoVendasChurn: 0.65,
          incrementoGlobal: 0
        },
        {
          regionalId,
          tipoMeta: 'Churn',
          meta1Volume: 5,
          meta1Percent: 8,
          meta2Volume: 10,
          meta2Percent: 5,
          meta3Volume: 15,
          meta3Percent: 2,
          pesoVendasChurn: 0.35,
          incrementoGlobal: 0
        }
      ];

      let inserted = 0;
      regrasParaInserir.forEach(regra => {
        db.run(
          `INSERT INTO regras_comissao (
            regionalId, tipoMeta, meta1Volume, meta1Percent, 
            meta2Volume, meta2Percent, meta3Volume, meta3Percent,
            pesoVendasChurn, incrementoGlobal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [regra.regionalId, regra.tipoMeta, regra.meta1Volume, regra.meta1Percent,
           regra.meta2Volume, regra.meta2Percent, regra.meta3Volume, regra.meta3Percent,
           regra.pesoVendasChurn, regra.incrementoGlobal],
          function(err) {
            if (!err) {
              inserted++;
              if (inserted === regrasParaInserir.length) {
                console.log(`✅ ${inserted} regras inseridas!\n`);
                executarAnalise();
              }
            }
          }
        );
      });
    } else {
      console.log(`✅ ${regras.length} regra(s) de comissão encontrada(s)\n`);
      executarAnalise();
    }
  });

  function executarAnalise() {
    // 2. Buscar regras de Vendas e Churn
    db.get(
      `SELECT * FROM regras_comissao WHERE regionalId = ? AND LOWER(tipoMeta) = 'vendas' LIMIT 1`,
      [regionalId],
      (err, metaVendas) => {
        db.get(
          `SELECT * FROM regras_comissao WHERE regionalId = ? AND LOWER(tipoMeta) = 'churn' LIMIT 1`,
          [regionalId],
          (err, metaChurn) => {
            
            console.log('📋 REGRAS DE COMISSÃO:');
            console.log('\n   VENDAS:');
            if (metaVendas) {
              console.log(`     • Meta1: ${metaVendas.meta1Volume} unidades → ${metaVendas.meta1Percent}%`);
              console.log(`     • Meta2: ${metaVendas.meta2Volume} unidades → ${metaVendas.meta2Percent}%`);
              console.log(`     • Meta3: ${metaVendas.meta3Volume} unidades → ${metaVendas.meta3Percent}%`);
              console.log(`     • Peso Vendas: ${(metaVendas.pesoVendasChurn * 100).toFixed(2)}%`);
            }

            console.log('\n   CHURN:');
            if (metaChurn) {
              console.log(`     • Meta1: ≤ ${metaChurn.meta1Volume} → ${metaChurn.meta1Percent}%`);
              console.log(`     • Meta2: ≤ ${metaChurn.meta2Volume} → ${metaChurn.meta2Percent}%`);
              console.log(`     • Meta3: ≤ ${metaChurn.meta3Volume} → ${metaChurn.meta3Percent}%`);
              console.log(`     • Peso Churn: ${((1 - metaVendas.pesoVendasChurn) * 100).toFixed(2)}%`);
            }

            // 3. Buscar totalização de vendas
            db.get(
              `SELECT COUNT(*) as total_vendedores, 
                      SUM(vendas_volume) as total_volume,
                      SUM(vendas_financeiro) as total_financeiro
               FROM vendas_mensais
               WHERE regional_id = ? AND periodo = ?`,
              [regionalId, periodo],
              (err, vendas) => {
                const totalVolume = vendas?.total_volume || 0;
                const totalFinanceiro = vendas?.total_financeiro || 0;
                const totalVendedores = vendas?.total_vendedores || 0;

                console.log('\n' + '='.repeat(70));
                console.log('📈 DADOS REAIS - VENDAS:');
                console.log('='.repeat(70));
                console.log(`\n   Período: ${periodo}`);
                console.log(`   Total de vendedores: ${totalVendedores}`);
                console.log(`   Total de unidades vendidas: ${totalVolume}`);
                console.log(`   Total financeiro: R$ ${parseFloat(totalFinanceiro || 0).toFixed(2)}`);

                // Calcular percentual alcançado de vendas
                let percentualVendas = 0;
                let nivelVendas = '';
                if (metaVendas) {
                  if (totalVolume >= metaVendas.meta1Volume) {
                    percentualVendas = normalizarPercentual(metaVendas.meta1Percent);
                    nivelVendas = 'Meta1 ✓';
                  } else if (totalVolume >= metaVendas.meta2Volume) {
                    percentualVendas = normalizarPercentual(metaVendas.meta2Percent);
                    nivelVendas = 'Meta2 ✓';
                  } else if (totalVolume >= metaVendas.meta3Volume) {
                    percentualVendas = normalizarPercentual(metaVendas.meta3Percent);
                    nivelVendas = 'Meta3 ✓';
                  } else {
                    percentualVendas = 0;
                    nivelVendas = 'Abaixo da Meta3 ✗';
                  }
                  console.log(`   Status: ${nivelVendas}`);
                  console.log(`   Percentual Alcançado (Vendas): ${(percentualVendas * 100).toFixed(2)}%`);
                }

                // 4. Buscar dados de Churn
                db.get(
                  `SELECT SUM(churn) as total_churn FROM churn_regionais
                   WHERE regional_id = ? AND periodo = ?`,
                  [regionalId, periodo],
                  (err, churnData) => {
                    const totalChurn = churnData?.total_churn || 0;

                    console.log('\n' + '='.repeat(70));
                    console.log('⚠️  DADOS REAIS - CHURN:');
                    console.log('='.repeat(70));
                    console.log(`\n   Total de churn: ${totalChurn}`);

                    let percentualChurn = 0;
                    let nivelChurn = '';
                    if (metaChurn) {
                      // Para churn, quanto MENOS melhor
                      if (totalChurn <= metaChurn.meta1Volume) {
                        percentualChurn = normalizarPercentual(metaChurn.meta1Percent);
                        nivelChurn = 'Meta1 ✓ (menor que ' + metaChurn.meta1Volume + ')';
                      } else if (totalChurn <= metaChurn.meta2Volume) {
                        percentualChurn = normalizarPercentual(metaChurn.meta2Percent);
                        nivelChurn = 'Meta2 ✓ (menor que ' + metaChurn.meta2Volume + ')';
                      } else if (totalChurn <= metaChurn.meta3Volume) {
                        percentualChurn = normalizarPercentual(metaChurn.meta3Percent);
                        nivelChurn = 'Meta3 ✓ (menor que ' + metaChurn.meta3Volume + ')';
                      } else {
                        percentualChurn = 0;
                        nivelChurn = 'Acima da Meta3 ✗';
                      }
                      console.log(`   Status: ${nivelChurn}`);
                      console.log(`   Percentual Alcançado (Churn): ${(percentualChurn * 100).toFixed(2)}%`);
                    }

                    // 5. Calcular percentuais ponderados
                    console.log('\n' + '='.repeat(70));
                    console.log('⚖️  CÁLCULO DOS PERCENTUAIS PONDERADOS:');
                    console.log('='.repeat(70));

                    const pesoVendas = metaVendas ? parseFloat(metaVendas.pesoVendasChurn) || 0.5 : 0.5;
                    const pesoChurn = 1 - pesoVendas;

                    const percentualVendasPonderado = percentualVendas * pesoVendas;
                    const percentualChurnPonderado = percentualChurn * pesoChurn;
                    const somaPercentuaisPonderados = percentualVendasPonderado + percentualChurnPonderado;

                    console.log(`\n   Percentual Vendas Ponderado:`);
                    console.log(`     ${(percentualVendas * 100).toFixed(2)}% × ${(pesoVendas * 100).toFixed(2)}% = ${(percentualVendasPonderado * 100).toFixed(2)}%`);

                    console.log(`\n   Percentual Churn Ponderado:`);
                    console.log(`     ${(percentualChurn * 100).toFixed(2)}% × ${(pesoChurn * 100).toFixed(2)}% = ${(percentualChurnPonderado * 100).toFixed(2)}%`);

                    console.log(`\n   SOMA DOS PERCENTUAIS PONDERADOS:`);
                    console.log(`     ${(percentualVendasPonderado * 100).toFixed(2)}% + ${(percentualChurnPonderado * 100).toFixed(2)}%`);
                    console.log(`     = ${(somaPercentuaisPonderados * 100).toFixed(2)}%`);

                    // 6. Buscar um vendedor para exemplo de comissão
                    db.all(
                      `SELECT c.id, c.nome, vm.vendas_volume, vm.vendas_financeiro, vm.percentual_alcancado
                       FROM colaboradores c
                       LEFT JOIN vendas_mensais vm ON c.id = vm.vendedor_id AND vm.periodo = ?
                       WHERE c.regional_id = ? AND c.status = 'ativo' AND vm.vendas_financeiro > 0
                       LIMIT 3`,
                      [periodo, regionalId],
                      (err, vendedores) => {
                        if (vendedores && vendedores.length > 0) {
                          console.log('\n' + '='.repeat(70));
                          console.log('💰 EXEMPLO DE COMISSÃO INDIVIDUAL:');
                          console.log('='.repeat(70));

                          vendedores.forEach((v, idx) => {
                            console.log(`\n   Vendedor ${idx + 1}: ${v.nome}`);
                            console.log(`   Período: ${periodo}`);
                            console.log(`   Volume de Vendas: ${v.vendas_volume} unidades`);
                            console.log(`   Valor Total: R$ ${parseFloat(v.vendas_financeiro).toFixed(2)}`);
                            console.log(`\n   Fórmula da Comissão:`);
                            console.log(`   = (R$ ${parseFloat(v.vendas_financeiro).toFixed(2)} × ${(percentualVendasPonderado * 100).toFixed(2)}%)`);
                            console.log(`     + (R$ ${parseFloat(v.vendas_financeiro).toFixed(2)} × ${(somaPercentuaisPonderados * 100).toFixed(2)}%)`);

                            const componente1 = parseFloat(v.vendas_financeiro) * percentualVendasPonderado;
                            const componente2 = parseFloat(v.vendas_financeiro) * somaPercentuaisPonderados;
                            const comissaoTotal = componente1 + componente2;

                            console.log(`   = R$ ${componente1.toFixed(2)} + R$ ${componente2.toFixed(2)}`);
                            console.log(`   = R$ ${comissaoTotal.toFixed(2)}`);
                          });
                        }

                        console.log('\n' + '='.repeat(70));
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
});
