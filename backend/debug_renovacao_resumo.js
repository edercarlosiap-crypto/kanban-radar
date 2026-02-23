const { db_get } = require('./src/config/database');

// Reproduzir a função calcularPercentualPorMeta
const calcularPercentualPorMeta = (valorAtingido, meta, inverterPolaridade = false) => {
  if (!meta || valorAtingido === 0) return 0;

  const meta1Volume = Number(meta.meta1Volume);
  const meta2Volume = Number(meta.meta2Volume);
  const meta3Volume = Number(meta.meta3Volume);

  const meta1Percent = Number(meta.meta1Percent);
  const meta2Percent = Number(meta.meta2Percent);
  const meta3Percent = Number(meta.meta3Percent);

  console.log('\n📊 ENTRADA DA FUNÇÃO calcularPercentualPorMeta:');
  console.log('  valorAtingido:', valorAtingido);
  console.log('  meta1Volume:', meta1Volume, '→', meta1Percent * 100 + '%');
  console.log('  meta2Volume:', meta2Volume, '→', meta2Percent * 100 + '%');
  console.log('  meta3Volume:', meta3Volume, '→', meta3Percent * 100 + '%');

  if (inverterPolaridade) {
    // Churn: quanto menor, melhor
    if (valorAtingido <= meta1Volume) return meta1Percent;
    if (valorAtingido <= meta2Volume) return meta2Percent;
    if (valorAtingido <= meta3Volume) return meta3Percent;
  } else {
    // Vendas: quanto maior, melhor - verifica meta3 (menor) primeiro
    console.log('\n🔍 VERIFICANDO METAS:');
    console.log(`  ${valorAtingido} >= ${meta3Volume} (Meta3)?`, valorAtingido >= meta3Volume);
    
    if (valorAtingido >= meta3Volume) {
      console.log(`  ${valorAtingido} >= ${meta2Volume} (Meta2)?`, valorAtingido >= meta2Volume);
      
      if (valorAtingido >= meta2Volume) {
        console.log(`  ${valorAtingido} >= ${meta1Volume} (Meta1)?`, valorAtingido >= meta1Volume);
        
        if (valorAtingido >= meta1Volume) {
          console.log('  ✅ RESULTADO: Meta1 atingida →', meta1Percent * 100 + '%');
          return meta1Percent;
        } else {
          console.log('  ✅ RESULTADO: Meta2 atingida →', meta2Percent * 100 + '%');
          return meta2Percent;
        }
      } else {
        console.log('  ✅ RESULTADO: Meta3 atingida →', meta3Percent * 100 + '%');
        return meta3Percent;
      }
    }
  }
  
  console.log('  ❌ RESULTADO: Nenhuma meta atingida → 0%');
  return 0;
};

setTimeout(async () => {
  try {
    const regionalId = 'bd402487-06a3-40c3-b206-2fc7bf5d9db4'; // Alta Floresta Doeste
    const periodo = 'Dez/25';
    
    console.log('🔎 DEBUG: PERCENTUAL DE RESUMO RENOVAÇÃO');
    console.log('══════════════════════════════════════════\n');
    
    // 1. Buscar meta de renovação
    const metaRenovacao = await db_get(`
      SELECT meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'renovação'
    `, [regionalId, periodo]);
    
    console.log('📋 META DE RENOVAÇÃO:');
    console.log('  Meta1:', metaRenovacao.meta1Volume, 'unidades →', (metaRenovacao.meta1Percent * 100) + '%');
    console.log('  Meta2:', metaRenovacao.meta2Volume, 'unidades →', (metaRenovacao.meta2Percent * 100) + '%');
    console.log('  Meta3:', metaRenovacao.meta3Volume, 'unidades →', (metaRenovacao.meta3Percent * 100) + '%');
    
    // 2. Buscar total de renovação da regional
    const renovacaoData = await db_get(`
      SELECT SUM(renovacao_volume) as totalVolume
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    
    const totalRenovacao = renovacaoData?.totalVolume || 0;
    
    console.log('\n📊 REALIZADO (TOTAL DA REGIONAL):');
    console.log('  Total de renovações:', totalRenovacao);
    
    // 3. Calcular percentual de resumo
    const percentualRenovacaoResumo = metaRenovacao 
      ? calcularPercentualPorMeta(totalRenovacao, {
          meta1Volume: metaRenovacao.meta1Volume,
          meta1Percent: metaRenovacao.meta1Percent || 0,
          meta2Volume: metaRenovacao.meta2Volume,
          meta2Percent: metaRenovacao.meta2Percent || 0,
          meta3Volume: metaRenovacao.meta3Volume,
          meta3Percent: metaRenovacao.meta3Percent || 0
        })
      : 0;
    
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 RESULTADO FINAL:');
    console.log('  Percentual de Resumo RENOVAÇÃO:', (percentualRenovacaoResumo * 100).toFixed(2) + '%');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 4. Testar com Vendedor Padrão
    console.log('\n👤 VENDEDOR PADRÃO:');
    const vendedorPadrao = await db_get(`
      SELECT renovacao_volume, renovacao_financeiro
      FROM vendas_mensais
      WHERE vendedor_id = '13a2b5a8-deba-4482-862c-50538ff421e2'
        AND regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    
    console.log('  Volume individual:', vendedorPadrao.renovacao_volume);
    console.log('  Valor financeiro: R$', vendedorPadrao.renovacao_financeiro);
    
    const percentualIndividual = calcularPercentualPorMeta(vendedorPadrao.renovacao_volume, {
      meta1Volume: metaRenovacao.meta1Volume,
      meta1Percent: metaRenovacao.meta1Percent || 0,
      meta2Volume: metaRenovacao.meta2Volume,
      meta2Percent: metaRenovacao.meta2Percent || 0,
      meta3Volume: metaRenovacao.meta3Volume,
      meta3Percent: metaRenovacao.meta3Percent || 0
    });
    
    console.log('\n💰 CÁLCULO DE COMISSÃO:');
    console.log('  Percentual Coletivo (Resumo):', (percentualRenovacaoResumo * 100).toFixed(2) + '%');
    console.log('  Percentual Individual:', (percentualIndividual * 100).toFixed(2) + '%');
    console.log('  Comissão Coletiva: R$', (vendedorPadrao.renovacao_financeiro * percentualRenovacaoResumo).toFixed(2));
    console.log('  Comissão Individual: R$', (vendedorPadrao.renovacao_financeiro * percentualIndividual).toFixed(2));
    console.log('  TOTAL: R$', (vendedorPadrao.renovacao_financeiro * (percentualRenovacaoResumo + percentualIndividual)).toFixed(2));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  process.exit(0);
}, 3000);
