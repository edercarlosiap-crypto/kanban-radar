const { db_all, db_get } = require('../src/config/database');

async function diagnosticarIDs() {
  try {
    console.log('🔍 DIAGNÓSTICO DE IDs\n');

    // Pegar uma regional específica
    const regional = await db_get('SELECT id, nome FROM regionais WHERE ativo = 1 LIMIT 1');
    console.log(`📍 REGIONAL TESTE: ${regional.nome}`);
    console.log(`   ID: ${regional.id}\n`);

    // Verificar colaboradores desta regional
    const colaboradores = await db_all(
      'SELECT id, nome, regional_id FROM colaboradores WHERE regional_id = ? AND status = "ativo"',
      [regional.id]
    );
    console.log(`👥 COLABORADORES com regional_id = "${regional.id}":`, colaboradores.length);
    if (colaboradores.length > 0) {
      console.log(`   Exemplo: ${colaboradores[0].nome}\n`);
    }

    // Verificar vendas_mensais com esta regional
    const vendas = await db_all(
      'SELECT COUNT(*) as qtd FROM vendas_mensais WHERE regional_id = ?',
      [regional.id]
    );
    console.log(`📊 VENDAS MENSAIS com regional_id = "${regional.id}":`, vendas[0].qtd);

    // Verificar vendas_mensais com o primeiro vendedor
    if (colaboradores.length > 0) {
      const vendedor = colaboradores[0];
      const vendasVendedor = await db_get(
        `SELECT * FROM vendas_mensais WHERE vendedor_id = ? AND regional_id = ? AND periodo = 'Dez/25'`,
        [vendedor.id, regional.id]
      );
      console.log(`\n🔗 VENDAS do vendedor "${vendedor.nome}" em Dez/25:`);
      console.log(vendasVendedor ? `   ✅ ENCONTRADO: ${vendasVendedor.vendas_volume} vendas` : '   ❌ NÃO ENCONTRADO');
      
      if (vendasVendedor) {
        console.log('\n📦 DADOS COMPLETOS:');
        console.log(`   vendedor_id: ${vendasVendedor.vendedor_id}`);
        console.log(`   regional_id: ${vendasVendedor.regional_id}`);
        console.log(`   periodo: ${vendasVendedor.periodo}`);
      }
    }

    // Verificar regra de comissão para esta regional
    const regra = await db_get(
      `SELECT * FROM regras_comissao WHERE regionalId = ? AND periodo = 'Dez/25' AND LOWER(tipoMeta) = 'vendas'`,
      [regional.id]
    );
    console.log(`\n⚙️  REGRA DE COMISSÃO para Dez/25:`);
    console.log(regra ? `   ✅ ENCONTRADA: Meta1=${regra.meta1Volume} (${regra.meta1PercentIndividual}%)` : '   ❌ NÃO ENCONTRADA');

    console.log('\n✅ Diagnóstico concluído!');
    process.exit(0);

  } catch (erro) {
    console.error('❌ Erro:', erro);
    process.exit(1);
  }
}

setTimeout(() => {
  diagnosticarIDs();
}, 1000);
