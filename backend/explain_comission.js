const { db_get } = require('./src/config/database');

setTimeout(async () => {
  try {
    const regionalId = 'bd402487-06a3-40c3-b206-2fc7bf5d9db4';
    const periodo = 'Dez/25';
    
    console.log('📊 Calculando volumes de renovação...\n');
    
    // Total da regional (coletivo)
    const totalRegional = await db_get(`
      SELECT SUM(renovacao_volume) as total
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    
    console.log('🏢 Total REGIONAL:', totalRegional.total, 'renovações');
    
    // Total do Vendedor Padrão (individual)
    const vendedorPadrao = await db_get(`
      SELECT renovacao_volume, renovacao_financeiro
      FROM vendas_mensais
      WHERE vendedor_id = '13a2b5a8-deba-4482-862c-50538ff421e2'
        AND regional_id = ? 
        AND periodo = ?
    `, [regionalId, periodo]);
    
    console.log('👤 Vendedor Padrão:', vendedorPadrao.renovacao_volume, 'renovações');
    console.log('💰 Valor financeiro:', 'R$', vendedorPadrao.renovacao_financeiro);
    
    // Buscar meta
    const meta = await db_get(`
      SELECT meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'renovação'
    `, [regionalId, periodo]);
    
    console.log('\n📋 Regra de comissão:');
    console.log(`  Meta 1: ${meta.meta1Volume} unidades → ${meta.meta1Percent * 100}%`);
    console.log(`  Meta 2: ${meta.meta2Volume} unidades → ${meta.meta2Percent * 100}%`);
    console.log(`  Meta 3: ${meta.meta3Volume} unidades → ${meta.meta3Percent * 100}%`);
    
    // Calcular percentuais
    let percentualColetivo = 0;
    if (totalRegional.total >= meta.meta1Volume) percentualColetivo = meta.meta1Percent;
    else if (totalRegional.total >= meta.meta2Volume) percentualColetivo = meta.meta2Percent;
    else if (totalRegional.total >= meta.meta3Volume) percentualColetivo = meta.meta3Percent;
    
    let percentualIndividual = 0;
    if (vendedorPadrao.renovacao_volume >= meta.meta1Volume) percentualIndividual = meta.meta1Percent;
    else if (vendedorPadrao.renovacao_volume >= meta.meta2Volume) percentualIndividual = meta.meta2Percent;
    else if (vendedorPadrao.renovacao_volume >= meta.meta3Volume) percentualIndividual = meta.meta3Percent;
    
    console.log('\n🎯 Cálculos:');
    console.log(`\n  COLETIVO (regional):`);
    console.log(`    Volume: ${totalRegional.total} unidades`);
    console.log(`    Percentual: ${percentualColetivo * 100}%`);
    console.log(`    Comissão: R$ ${vendedorPadrao.renovacao_financeiro * percentualColetivo}`);
    
    console.log(`\n  INDIVIDUAL (vendedor):`);
    console.log(`    Volume: ${vendedorPadrao.renovacao_volume} unidades`);
    console.log(`    Percentual: ${percentualIndividual * 100}%`);
    console.log(`    Comissão: R$ ${vendedorPadrao.renovacao_financeiro * percentualIndividual}`);
    
    console.log(`\n  SOMA (coletivo + individual):`);
    console.log(`    Percentual total: ${(percentualColetivo + percentualIndividual) * 100}%`);
    console.log(`    Comissão total: R$ ${vendedorPadrao.renovacao_financeiro * (percentualColetivo + percentualIndividual)}`);
    
  } catch (error) {
    console.error('Erro:', error);
  }
  
  process.exit(0);
}, 3000);
