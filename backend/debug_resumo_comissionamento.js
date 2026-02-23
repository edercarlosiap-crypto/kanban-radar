const { db_get, db_all } = require('./src/config/database');

// Função calcularPercentualPorMeta (copiada do controller)
const calcularPercentualPorMeta = (valorAtingido, meta, inverterPolaridade = false) => {
  if (!meta || valorAtingido === 0) return 0;

  const meta1Volume = Number(meta.meta1Volume);
  const meta2Volume = Number(meta.meta2Volume);
  const meta3Volume = Number(meta.meta3Volume);

  const meta1Percent = Number(meta.meta1Percent);
  const meta2Percent = Number(meta.meta2Percent);
  const meta3Percent = Number(meta.meta3Percent);

  if (inverterPolaridade) {
    // Churn: quanto menor, melhor
    if (valorAtingido <= meta1Volume) return meta1Percent;
    if (valorAtingido <= meta2Volume) return meta2Percent;
    if (valorAtingido <= meta3Volume) return meta3Percent;
  } else {
    // Vendas: quanto maior, melhor - verifica meta3 (menor) primeiro
    if (valorAtingido >= meta3Volume) {
      if (valorAtingido >= meta2Volume) {
        if (valorAtingido >= meta1Volume) {
          return meta1Percent;
        } else {
          return meta2Percent;
        }
      } else {
        return meta3Percent;
      }
    }
  }
  
  return 0;
};

const normalizarPercentual = (valor) => {
  if (!valor) return 0;
  const num = Number(valor);
  // Se o valor está entre 0 e 1, considera já normalizado
  if (num > 0 && num <= 1) return num;
  // Se maior que 1, divide por 100
  if (num > 1) return num / 100;
  return 0;
};

setTimeout(async () => {
  try {
    const regionalId = 'bd402487-06a3-40c3-b206-2fc7bf5d9db4'; // Alta Floresta Doeste
    const periodo = 'Dez/25';
    
    console.log('');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('  🔎 DEBUG: RESUMO DE COMISSIONAMENTO - RENOVAÇÃO');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📍 Contexto:');
    console.log(`  Regional: Alta Floresta Doeste`);
    console.log(`  Período: ${periodo}`);
    console.log('');
    
    // 1. Buscar meta de RENOVAÇÃO
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PASSO 1: Buscar Meta de RENOVAÇÃO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const metaRenovacao = await db_get(`
      SELECT 
        meta1Volume, meta1Percent,
        meta2Volume, meta2Percent,
        meta3Volume, meta3Percent,
        pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'renovação'
    `, [regionalId, periodo]);
    
    if (!metaRenovacao) {
      console.log('❌ Nenhuma meta de RENOVAÇÃO encontrada!');
      process.exit(0);
    }
    
    console.log('');
    console.log('📋 Meta encontrada:');
    console.log(`  Meta 1: ${metaRenovacao.meta1Volume} unidades → ${(metaRenovacao.meta1Percent * 100).toFixed(2)}%`);
    console.log(`  Meta 2: ${metaRenovacao.meta2Volume} unidades → ${(metaRenovacao.meta2Percent * 100).toFixed(2)}%`);
    console.log(`  Meta 3: ${metaRenovacao.meta3Volume} unidades → ${(metaRenovacao.meta3Percent * 100).toFixed(2)}%`);
    console.log(`  Peso (pesoVendasChurn): ${metaRenovacao.pesoVendasChurn || 'null'}`);
    
    // 2. Buscar total realizado
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PASSO 2: Buscar Total Realizado (Regional)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const renovacaoResult = await db_all(`
      SELECT SUM(renovacao_volume) as total
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    
    const totalRenovacao = renovacaoResult[0]?.total || 0;
    
    console.log('');
    console.log(`📊 Query: SUM(renovacao_volume) FROM vendas_mensais`);
    console.log(`         WHERE regional_id = '${regionalId}'`);
    console.log(`           AND periodo = '${periodo}'`);
    console.log('');
    console.log(`✅ Total de RENOVAÇÕES realizadas: ${totalRenovacao} unidades`);
    
    // 3. Calcular percentual atingido
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PASSO 3: Calcular Percentual Atingido');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('');
    console.log('🔍 Função: calcularPercentualPorMeta()');
    console.log(`  Entrada: valorAtingido = ${totalRenovacao}`);
    console.log(`  Meta 1: ${metaRenovacao.meta1Volume} → ${(metaRenovacao.meta1Percent * 100).toFixed(2)}%`);
    console.log(`  Meta 2: ${metaRenovacao.meta2Volume} → ${(metaRenovacao.meta2Percent * 100).toFixed(2)}%`);
    console.log(`  Meta 3: ${metaRenovacao.meta3Volume} → ${(metaRenovacao.meta3Percent * 100).toFixed(2)}%`);
    console.log('');
    console.log('📐 Lógica de verificação:');
    console.log(`  ${totalRenovacao} >= ${metaRenovacao.meta3Volume} (Meta 3)? ${totalRenovacao >= metaRenovacao.meta3Volume ? '✅ SIM' : '❌ NÃO'}`);
    
    if (totalRenovacao >= metaRenovacao.meta3Volume) {
      console.log(`  ${totalRenovacao} >= ${metaRenovacao.meta2Volume} (Meta 2)? ${totalRenovacao >= metaRenovacao.meta2Volume ? '✅ SIM' : '❌ NÃO'}`);
      
      if (totalRenovacao >= metaRenovacao.meta2Volume) {
        console.log(`  ${totalRenovacao} >= ${metaRenovacao.meta1Volume} (Meta 1)? ${totalRenovacao >= metaRenovacao.meta1Volume ? '✅ SIM' : '❌ NÃO'}`);
      }
    }
    
    const percentualRenovacao = calcularPercentualPorMeta(totalRenovacao, metaRenovacao);
    
    console.log('');
    console.log(`🎯 RESULTADO: Percentual Atingido = ${(percentualRenovacao * 100).toFixed(2)}%`);
    
    // 4. Explicar sobre peso (RENOVAÇÃO não tem peso)
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PASSO 4: Verificar Peso (Ponderação)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log('   Apenas VENDAS e CHURN têm peso (ponderação)');
    console.log('   RENOVAÇÃO não é ponderada');
    console.log('');
    console.log('   O percentual de RENOVAÇÃO é exibido no relatório,');
    console.log('   mas NÃO entra na soma dos percentuais ponderados.');
    
    // 5. Buscar Vendas e Churn para mostrar a soma ponderada completa
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PASSO 5: Calcular Soma dos Percentuais Ponderados');
    console.log('         (Apenas VENDAS + CHURN)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Buscar Vendas
    const metaVendas = await db_get(`
      SELECT 
        meta1Volume, meta1Percent,
        meta2Volume, meta2Percent,
        meta3Volume, meta3Percent,
        pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'vendas'
    `, [regionalId, periodo]);
    
    const vendasResult = await db_all(`
      SELECT SUM(vendas_volume) as vendas
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    
    const totalVendas = vendasResult[0]?.vendas || 0;
    const percentualVendas = metaVendas 
      ? calcularPercentualPorMeta(totalVendas, metaVendas)
      : 0;
    
    // Buscar Churn
    const metaChurn = await db_get(`
      SELECT 
        meta1Volume, meta1Percent,
        meta2Volume, meta2Percent,
        meta3Volume, meta3Percent
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'churn'
    `, [regionalId, periodo]);
    
    const churnResult = await db_get(`
      SELECT churn
      FROM churn_regionais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    
    const totalChurn = churnResult?.churn || 0;
    const percentualChurn = metaChurn
      ? calcularPercentualPorMeta(totalChurn, metaChurn, true)
      : 0;
    
    // Calcular pesos
    const pesoVendasChurn = metaVendas?.pesoVendasChurn || 0.5;
    const pesoVendas = pesoVendasChurn;
    const pesoChurn = 1 - pesoVendasChurn;
    
    const percentualVendasPonderado = percentualVendas * pesoVendas;
    const percentualChurnPonderado = percentualChurn * pesoChurn;
    const somaPercentuaisPonderados = percentualVendasPonderado + percentualChurnPonderado;
    
    console.log('');
    console.log('📊 VENDAS:');
    console.log(`  Realizado: ${totalVendas} unidades`);
    console.log(`  Percentual Atingido: ${(percentualVendas * 100).toFixed(2)}%`);
    console.log(`  Peso: ${(pesoVendas * 100).toFixed(2)}%`);
    console.log(`  Percentual Ponderado: ${(percentualVendasPonderado * 100).toFixed(2)}%`);
    console.log('');
    console.log('📊 CHURN:');
    console.log(`  Realizado: ${totalChurn} unidades`);
    console.log(`  Percentual Atingido: ${(percentualChurn * 100).toFixed(2)}%`);
    console.log(`  Peso: ${(pesoChurn * 100).toFixed(2)}%`);
    console.log(`  Percentual Ponderado: ${(percentualChurnPonderado * 100).toFixed(2)}%`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 SOMA DOS PERCENTUAIS PONDERADOS:');
    console.log(`   ${(percentualVendasPonderado * 100).toFixed(2)}% + ${(percentualChurnPonderado * 100).toFixed(2)}% = ${(somaPercentuaisPonderados * 100).toFixed(2)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 6. Resumo final
    console.log('');
    console.log('');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('  📋 RESUMO DO RELATÓRIO "RESUMO DE COMISSIONAMENTO"');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('🔹 RENOVAÇÃO:');
    console.log(`   Realizado: ${totalRenovacao} unidades`);
    console.log(`   % Atingido: ${(percentualRenovacao * 100).toFixed(2)}%`);
    console.log(`   Peso: N/A (não ponderado)`);
    console.log(`   % Ponderado: N/A`);
    console.log('');
    console.log('🔹 VENDAS:');
    console.log(`   Realizado: ${totalVendas} unidades`);
    console.log(`   % Atingido: ${(percentualVendas * 100).toFixed(2)}%`);
    console.log(`   Peso: ${(pesoVendas * 100).toFixed(2)}%`);
    console.log(`   % Ponderado: ${(percentualVendasPonderado * 100).toFixed(2)}%`);
    console.log('');
    console.log('🔹 CHURN:');
    console.log(`   Realizado: ${totalChurn} unidades`);
    console.log(`   % Atingido: ${(percentualChurn * 100).toFixed(2)}%`);
    console.log(`   Peso: ${(pesoChurn * 100).toFixed(2)}%`);
    console.log(`   % Ponderado: ${(percentualChurnPonderado * 100).toFixed(2)}%`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 SOMA DOS PERCENTUAIS PONDERADOS (apenas Vendas + Churn):');
    console.log(`   ${(somaPercentuaisPonderados * 100).toFixed(2)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  process.exit(0);
}, 3000);
