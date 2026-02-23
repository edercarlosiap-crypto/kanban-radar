const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

console.log('🧪 TESTANDO CORREÇÃO - Renovação Vendedor Padrão\n');
console.log('📋 CASO DE TESTE:');
console.log('   Regional: Alta Floresta Doeste');
console.log('   Período: Dez/25');
console.log('   Vendedor: Vendedor Padrão');
console.log('   Tipo: Renovação');
console.log('   Volume Vendedor: 36');
console.log('   Valor: R$ 3.600\n');

// 1. Buscar ID da regional
db.get(`
  SELECT id, nome 
  FROM regionais 
  WHERE nome LIKE '%Alta Floresta%'
`, [], (err, regional) => {
  if (err) {
    console.error('❌ Erro ao buscar regional:', err);
    db.close();
    return;
  }
  
  if (!regional) {
    console.log('❌ Regional não encontrada');
    db.close();
    return;
  }

  console.log(`✅ Regional encontrada: ${regional.nome} (ID: ${regional.id})\n`);

  // 2. Buscar metas de renovação
  db.get(`
    SELECT 
      meta1Volume, meta1Percent, meta1PercentIndividual,
      meta2Volume, meta2Percent, meta2PercentIndividual,
      meta3Volume, meta3Percent, meta3PercentIndividual,
      incrementoGlobal
    FROM regras_comissao
    WHERE regionalId = ? AND periodo = 'Dez/25' AND LOWER(tipoMeta) = 'renovação'
  `, [regional.id], (err, meta) => {
    if (err) {
      console.error('❌ Erro ao buscar metas:', err);
      db.close();
      return;
    }

    if (!meta) {
      console.log('❌ Meta de renovação não encontrada');
      db.close();
      return;
    }

    console.log('📊 METAS GLOBAIS (Regional):');
    console.table({
      'Meta 1': { Volume: meta.meta1Volume, 'Global %': `${(meta.meta1Percent * 100).toFixed(2)}%`, 'Individual %': `${(meta.meta1PercentIndividual * 100).toFixed(2)}%` },
      'Meta 2': { Volume: meta.meta2Volume, 'Global %': `${(meta.meta2Percent * 100).toFixed(2)}%`, 'Individual %': `${(meta.meta2PercentIndividual * 100).toFixed(2)}%` },
      'Meta 3': { Volume: meta.meta3Volume, 'Global %': `${(meta.meta3Percent * 100).toFixed(2)}%`, 'Individual %': `${(meta.meta3PercentIndividual * 100).toFixed(2)}%` }
    });

    // 3. Buscar número de vendedores
    db.get(`
      SELECT COUNT(*) as total
      FROM colaboradores
      WHERE regional_id = ? AND status = 'ativo'
    `, [regional.id], (err, vendedoresCount) => {
      if (err) {
        console.error('❌ Erro ao contar vendedores:', err);
        db.close();
        return;
      }

      const totalVendedores = vendedoresCount.total;
      const incrementoGlobal = meta.incrementoGlobal || 0;

      console.log(`\n👥 Total de vendedores ativos: ${totalVendedores}`);
      console.log(`📈 Incremento Global: ${(incrementoGlobal * 100).toFixed(2)}%\n`);

      // 4. Calcular meta individual por vendedor
      const metaIndividual1 = (meta.meta1Volume / totalVendedores) * (1 + incrementoGlobal);
      const metaIndividual2 = (meta.meta2Volume / totalVendedores) * (1 + incrementoGlobal);
      const metaIndividual3 = (meta.meta3Volume / totalVendedores) * (1 + incrementoGlobal);

      console.log('🎯 METAS INDIVIDUAIS (Por Vendedor):');
      console.table({
        'Meta 1': { Volume: metaIndividual1.toFixed(2), '%': `${(meta.meta1PercentIndividual * 100).toFixed(2)}%` },
        'Meta 2': { Volume: metaIndividual2.toFixed(2), '%': `${(meta.meta2PercentIndividual * 100).toFixed(2)}%` },
        'Meta 3': { Volume: metaIndividual3.toFixed(2), '%': `${(meta.meta3PercentIndividual * 100).toFixed(2)}%` }
      });

      // 5. Buscar vendedor padrão
      db.get(`
        SELECT id, nome
        FROM colaboradores
        WHERE regional_id = ? AND nome LIKE '%Vendedor Padr%'
      `, [regional.id], (err, vendedor) => {
        if (err) {
          console.error('❌ Erro ao buscar vendedor:', err);
          db.close();
          return;
        }

        if (!vendedor) {
          console.log('❌ Vendedor Padrão não encontrado');
          db.close();
          return;
        }

        console.log(`\n👤 Vendedor: ${vendedor.nome}\n`);

        // 6. Buscar renovações do vendedor
        db.get(`
          SELECT renovacao_volume, renovacao_financeiro
          FROM vendas_mensais
          WHERE vendedor_id = ? AND periodo = 'Dez/25'
        `, [vendedor.id], (err, vendas) => {
          if (err) {
            console.error('❌ Erro ao buscar vendas:', err);
            db.close();
            return;
          }

          if (!vendas || !vendas.renovacao_volume) {
            console.log('⚠️  Vendedor sem renovações registradas');
            db.close();
            return;
          }

          const volumeVendedor = vendas.renovacao_volume;
          const valorFinanceiro = vendas.renovacao_financeiro;

          console.log('📦 RESULTADO DO VENDEDOR:');
          console.log(`   Volume: ${volumeVendedor} renovações`);
          console.log(`   Valor: R$ ${valorFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`);

          // 7. Calcular qual meta foi atingida
          let percentualIndividual = 0;
          let metaAtingida = 'Nenhuma';

          if (volumeVendedor >= metaIndividual1) {
            percentualIndividual = meta.meta1PercentIndividual;
            metaAtingida = 'Meta 1';
          } else if (volumeVendedor >= metaIndividual2) {
            percentualIndividual = meta.meta2PercentIndividual;
            metaAtingida = 'Meta 2';
          } else if (volumeVendedor >= metaIndividual3) {
            percentualIndividual = meta.meta3PercentIndividual;
            metaAtingida = 'Meta 3';
          }

          console.log('🎯 CÁLCULO DA META INDIVIDUAL:');
          console.log(`   ${volumeVendedor} >= ${metaIndividual3.toFixed(2)} (Meta 3)? ${volumeVendedor >= metaIndividual3 ? '✅ SIM' : '❌ NÃO'}`);
          console.log(`   ${volumeVendedor} >= ${metaIndividual2.toFixed(2)} (Meta 2)? ${volumeVendedor >= metaIndividual2 ? '✅ SIM' : '❌ NÃO'}`);
          console.log(`   ${volumeVendedor} >= ${metaIndividual1.toFixed(2)} (Meta 1)? ${volumeVendedor >= metaIndividual1 ? '✅ SIM' : '❌ NÃO'}`);
          console.log(`\n   ➡️  Meta Atingida: ${metaAtingida}`);
          console.log(`   ➡️  Percentual Individual: ${(percentualIndividual * 100).toFixed(2)}%\n`);

          // 8. Buscar total da regional
          db.get(`
            SELECT SUM(renovacao_volume) as totalRegional
            FROM vendas_mensais
            WHERE regional_id = ? AND periodo = 'Dez/25'
          `, [regional.id], (err, totalRegionalData) => {
            if (err) {
              console.error('❌ Erro ao buscar total regional:', err);
              db.close();
              return;
            }

            const totalRegional = totalRegionalData?.totalRegional || 0;
            
            // Calcular percentual coletivo (regional)
            let percentualColetivo = 0;
            if (totalRegional >= meta.meta1Volume) {
              percentualColetivo = meta.meta1Percent;
            } else if (totalRegional >= meta.meta2Volume) {
              percentualColetivo = meta.meta2Percent;
            } else if (totalRegional >= meta.meta3Volume) {
              percentualColetivo = meta.meta3Percent;
            }

            console.log('🌐 RESULTADO COLETIVO (Regional):');
            console.log(`   Total Regional: ${totalRegional} renovações`);
            console.log(`   Percentual Coletivo: ${(percentualColetivo * 100).toFixed(2)}%\n`);

            // 9. Calcular comissão
            const comissaoColetiva = valorFinanceiro * percentualColetivo;
            const comissaoIndividual = valorFinanceiro * percentualIndividual;
            const comissaoTotal = comissaoColetiva + comissaoIndividual;

            console.log('💰 CÁLCULO DA COMISSÃO:');
            console.log(`   Comissão Coletiva  = R$ ${valorFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} × ${(percentualColetivo * 100).toFixed(2)}% = R$ ${comissaoColetiva.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
            console.log(`   Comissão Individual = R$ ${valorFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} × ${(percentualIndividual * 100).toFixed(2)}% = R$ ${comissaoIndividual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
            console.log(`   ────────────────────────────────────────────────`);
            console.log(`   TOTAL             = R$ ${comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`);

            console.log('✅ RESULTADO ESPERADO: R$ 36,00');
            console.log(`${comissaoTotal === 36 ? '✅' : '❌'} RESULTADO OBTIDO:   R$ ${comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`);

            if (comissaoTotal === 36) {
              console.log('🎉 TESTE PASSOU! A correção está funcionando corretamente! 🎉');
            } else {
              console.log('⚠️  TESTE FALHOU! Ainda há algo incorreto.');
            }

            db.close();
          });
        });
      });
    });
  });
});
