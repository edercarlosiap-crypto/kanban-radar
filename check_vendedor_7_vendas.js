const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

const regionalId = 'bd402487-06a3-40c3-b206-2fc7bf5d9db4';
const periodo = 'Dez/25';

console.log('\n📊 BUSCANDO VENDEDORES COM VENDAS EM DEZ/25 - ALTA FLORESTA\n');

// Buscar vendedores e suas vendas
db.all(`
  SELECT 
    c.nome,
    c.status,
    COALESCE(vm.vendas_volume, 0) as vendas_count,
    COALESCE(vm.vendas_financeiro, 0) as vendas_valor,
    COALESCE(vm.renovacao_volume, 0) as renovacao_count,
    COALESCE(vm.renovacao_financeiro, 0) as renovacao_valor
  FROM colaboradores c
  LEFT JOIN vendas_mensais vm ON c.id = vm.vendedor_id 
    AND vm.periodo = ?
    AND vm.regional_id = ?
  WHERE c.regional_id = ?
  ORDER BY vendas_count DESC
`, [periodo, regionalId, regionalId], (err, rows) => {
  if (err) {
    console.error('Erro:', err);
    db.close();
    return;
  }

  console.log('┌────────────────────────────┬───────┬──────────────┬────────────┬────────────────┬────────────────┐');
  console.log('│ Nome                       │ Ativo │ Vendas (qty) │ Vendas (R$)│ Renov. (qty)   │ Renov. (R$)    │');
  console.log('├────────────────────────────┼───────┼──────────────┼────────────┼────────────────┼────────────────┤');
  
  rows.forEach(row => {
    const nome = (row.nome || '').padEnd(26).substring(0, 26);
    const status = (row.status || 'N/A').substring(0, 5);
    const vendas = String(row.vendas_count || 0).padStart(12);
    const vendas_valor = String(row.vendas_valor ? 'R$ ' + row.vendas_valor.toFixed(2) : 'R$ 0.00').padStart(10);
    const renovacao = String(row.renovacao_count || 0).padStart(14);
    const renovacao_valor = String(row.renovacao_valor ? 'R$ ' + row.renovacao_valor.toFixed(2) : 'R$ 0.00').padStart(14);
    
    console.log(`│ ${nome} │ ${status.padEnd(5)} │${vendas} │${vendas_valor} │${renovacao} │${renovacao_valor} │`);
  });
  
  console.log('└────────────────────────────┴───────┴──────────────┴────────────┴────────────────┴────────────────┘');
  
  // Buscar vendedor específico com exatamente 7 vendas
  const vendedor7 = rows.find(r => r.vendas_count === 7);
  if (vendedor7) {
    console.log('\n✅ VENDEDOR COM 7 VENDAS ENCONTRADO:');
    console.log(`   Nome: ${vendedor7.nome}`);
    console.log(`   Volume: ${vendedor7.vendas_count} vendas`);
    console.log(`   Valor: R$ ${vendedor7.vendas_valor ? vendedor7.vendas_valor.toFixed(2) : '0.00'}`);
    console.log(`   Status: ${vendedor7.status}`);
  } else {
    console.log('\n❌ Nenhum vendedor com exatamente 7 vendas encontrado');
  }
  
  // Verificar metas de vendas para a regional
  console.log('\n📈 VERIFICANDO METAS DE VENDAS:');
  db.get(`
    SELECT 
      meta1Volume, meta1Percent, meta1PercentIndividual,
      meta2Volume, meta2Percent, meta2PercentIndividual,
      meta3Volume, meta3Percent, meta3PercentIndividual,
      incrementoGlobal
    FROM regras_comissao
    WHERE regionalId = ? 
      AND periodo = ? 
      AND LOWER(tipoMeta) = 'vendas'
  `, [regionalId, periodo], (err, meta) => {
    if (err) {
      console.error('Erro ao buscar metas:', err);
    } else if (meta) {
      console.log(`   Meta Global: ${meta.meta1Volume} (${(meta.meta1Percent*100).toFixed(0)}%), ${meta.meta2Volume} (${(meta.meta2Percent*100).toFixed(0)}%), ${meta.meta3Volume} (${(meta.meta3Percent*100).toFixed(0)}%)`);
      console.log(`   Meta Indiv.: ${meta.meta1PercentIndividual*100}%, ${meta.meta2PercentIndividual*100}%, ${meta.meta3PercentIndividual*100}%`);
      console.log(`   Incremento Global: ${(meta.incrementoGlobal*100).toFixed(0)}%`);
      
      // Calcular meta individual por vendedor
      const totalVendedores = rows.filter(r => r.status === 'ativo').length;
      if (totalVendedores > 0) {
        const metaIndiv1 = (meta.meta1Volume / totalVendedores) * (1 + meta.incrementoGlobal);
        const metaIndiv2 = (meta.meta2Volume / totalVendedores) * (1 + meta.incrementoGlobal);
        const metaIndiv3 = (meta.meta3Volume / totalVendedores) * (1 + meta.incrementoGlobal);
        
        console.log(`\n   Total Vendedores Ativos: ${totalVendedores}`);
        console.log(`   Meta Individual Calculada:`);
        console.log(`     Meta 1: ${metaIndiv1.toFixed(2)} (${(meta.meta1PercentIndividual*100).toFixed(0)}%)`);
        console.log(`     Meta 2: ${metaIndiv2.toFixed(2)} (${(meta.meta2PercentIndividual*100).toFixed(0)}%)`);
        console.log(`     Meta 3: ${metaIndiv3.toFixed(2)} (${(meta.meta3PercentIndividual*100).toFixed(0)}%)`);
        
        // Verificar se 7 vendas atinge alguma meta individual
        console.log(`\n   💡 ANÁLISE PARA 7 VENDAS:`);
        if (7 >= metaIndiv1) {
          console.log(`      ✅ Atinge Meta 1 (${metaIndiv1.toFixed(2)}) → ${(meta.meta1PercentIndividual*100).toFixed(0)}%`);
        } else if (7 >= metaIndiv2) {
          console.log(`      ✅ Atinge Meta 2 (${metaIndiv2.toFixed(2)}) → ${(meta.meta2PercentIndividual*100).toFixed(0)}%`);
        } else if (7 >= metaIndiv3) {
          console.log(`      ✅ Atinge Meta 3 (${metaIndiv3.toFixed(2)}) → ${(meta.meta3PercentIndividual*100).toFixed(0)}%`);
        } else {
          console.log(`      ❌ Não atinge nenhuma meta individual (menor que ${metaIndiv3.toFixed(2)})`);
        }
      }
    } else {
      console.log('   ❌ Metas não encontradas');
    }
    
    db.close();
  });
});
