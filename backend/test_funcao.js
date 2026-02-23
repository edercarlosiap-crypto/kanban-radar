const normalizarPercentual = (percent) => {
  if (typeof percent === 'number' && !isNaN(percent)) {
    return percent;
  }
  if (typeof percent === 'string') {
    return parseFloat(percent) || 0;
  }
  return 0;
};

const calcularPercentualPorMeta = (valorAtingido, meta, inverterPolaridade = false) => {
  if (!meta || valorAtingido === 0) return 0;

  const meta1Percent = normalizarPercentual(meta.meta1Percent);
  const meta2Percent = normalizarPercentual(meta.meta2Percent);
  const meta3Percent = normalizarPercentual(meta.meta3Percent);

  console.log('🔍 Debugging calcularPercentualPorMeta:');
  console.log('  valorAtingido:', valorAtingido);
  console.log('  meta:', meta);
  console.log('  inverterPolaridade:', inverterPolaridade);
  console.log('  meta1Percent normalizado:', meta1Percent);
  console.log('  meta2Percent normalizado:', meta2Percent);
  console.log('  meta3Percent normalizado:', meta3Percent);

  if (inverterPolaridade) {
    // Churn: quanto menor, melhor
    if (valorAtingido <= meta.meta1Volume) {
      console.log('  ✅ Churn: valorAtingido <= meta1Volume → retorna meta1Percent:', meta1Percent);
      return meta1Percent;
    }
    if (valorAtingido <= meta.meta2Volume) {
      console.log('  ✅ Churn: valorAtingido <= meta2Volume → retorna meta2Percent:', meta2Percent);
      return meta2Percent;
    }
    if (valorAtingido <= meta.meta3Volume) {
      console.log('  ✅ Churn: valorAtingido <= meta3Volume → retorna meta3Percent:', meta3Percent);
      return meta3Percent;
    }
  } else {
    // Vendas: quanto maior, melhor
    console.log('  Verificando vendas (quanto maior, melhor):');
    console.log(`    valorAtingido (${valorAtingido}) >= meta1Volume (${meta.meta1Volume})? ${valorAtingido >= meta.meta1Volume}`);
    if (valorAtingido >= meta.meta1Volume) {
      console.log('  ✅ Vendas: valorAtingido >= meta1Volume → retorna meta1Percent:', meta1Percent);
      return meta1Percent;
    }
    console.log(`    valorAtingido (${valorAtingido}) >= meta2Volume (${meta.meta2Volume})? ${valorAtingido >= meta.meta2Volume}`);
    if (valorAtingido >= meta.meta2Volume) {
      console.log('  ✅ Vendas: valorAtingido >= meta2Volume → retorna meta2Percent:', meta2Percent);
      return meta2Percent;
    }
    console.log(`    valorAtingido (${valorAtingido}) >= meta3Volume (${meta.meta3Volume})? ${valorAtingido >= meta.meta3Volume}`);
    if (valorAtingido >= meta.meta3Volume) {
      console.log('  ✅ Vendas: valorAtingido >= meta3Volume → retorna meta3Percent:', meta3Percent);
      return meta3Percent;
    }
  }
  
  console.log('  ❌ Abaixo da meta mínima → retorna 0');
  return 0;
};

// Teste com dados reais
const metaVendas = {
  meta1Volume: 95,
  meta1Percent: 0.15,
  meta2Volume: 76,
  meta2Percent: 0.07,
  meta3Volume: 61,
  meta3Percent: 0.03
};

console.log('\n=== TESTE: Vendas 79 unidades ===');
const resultado = calcularPercentualPorMeta(79, metaVendas, false);
console.log('\n📊 Resultado final:', resultado);
console.log('📊 Resultado em %:', (resultado * 100).toFixed(2) + '%');
console.log('\n✅ Esperado: 0.07 (7%)');
console.log(resultado === 0.07 ? '✅ CORRETO!' : '❌ ERRADO!');
