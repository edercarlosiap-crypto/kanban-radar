const { db_all, db_get } = require('../src/config/database');

async function diagnosticar() {
  try {
    console.log('🔍 DIAGNÓSTICO DE VENDEDORES E VENDAS\n');

    // 1. Verificar colaboradores
    console.log('📋 1. COLABORADORES:');
    const colaboradores = await db_all(`
      SELECT c.id, c.nome, c.regional_id, r.nome as regional_nome, c.status
      FROM colaboradores c
      LEFT JOIN regionais r ON c.regional_id = r.id
      ORDER BY r.nome, c.nome
    `);
    console.log(`   Total: ${colaboradores.length}`);
    if (colaboradores.length > 0) {
      console.log('   Primeiros 5:');
      colaboradores.slice(0, 5).forEach(c => {
        console.log(`   - ${c.nome} (${c.regional_nome}) [${c.status}]`);
      });
    }

    // 2. Verificar vendas mensais
    console.log('\n📊 2. VENDAS MENSAIS:');
    const vendasMensais = await db_all(`
      SELECT 
        vm.id, 
        vm.periodo, 
        vm.vendedor_id,
        c.nome as vendedor_nome,
        vm.regional_id,
        r.nome as regional_nome,
        vm.vendas_volume,
        vm.vendas_financeiro
      FROM vendas_mensais vm
      LEFT JOIN colaboradores c ON vm.vendedor_id = c.id
      LEFT JOIN regionais r ON vm.regional_id = r.id
      ORDER BY vm.periodo DESC, r.nome, c.nome
      LIMIT 10
    `);
    console.log(`   Total: ${vendasMensais.length}`);
    if (vendasMensais.length > 0) {
      console.log('   Primeiros 10:');
      vendasMensais.forEach(vm => {
        console.log(`   - ${vm.periodo} | ${vm.regional_nome} | ${vm.vendedor_nome || 'SEM NOME'} | Vendas: ${vm.vendas_volume}`);
      });
    } else {
      console.log('   ⚠️  NENHUMA VENDA MENSAL CADASTRADA!');
    }

    // 3. Verificar períodos únicos
    console.log('\n📅 3. PERÍODOS CADASTRADOS:');
    const periodos = await db_all(`
      SELECT DISTINCT periodo 
      FROM vendas_mensais 
      ORDER BY periodo DESC
    `);
    console.log(`   Total de períodos: ${periodos.length}`);
    periodos.forEach(p => {
      console.log(`   - "${p.periodo}"`);
    });

    // 4. Verificar regras de comissão
    console.log('\n⚙️  4. REGRAS DE COMISSÃO (VENDAS):');
    const regras = await db_all(`
      SELECT 
        rc.id,
        rc.periodo,
        rc.regionalId,
        r.nome as regional_nome,
        rc.tipoMeta,
        rc.meta1Volume,
        rc.meta1PercentIndividual
      FROM regras_comissao rc
      LEFT JOIN regionais r ON rc.regionalId = r.id
      WHERE LOWER(rc.tipoMeta) = 'vendas'
      ORDER BY rc.periodo DESC, r.nome
      LIMIT 10
    `);
    console.log(`   Total: ${regras.length}`);
    if (regras.length > 0) {
      console.log('   Primeiros 10:');
      regras.forEach(r => {
        console.log(`   - ${r.periodo} | ${r.regional_nome} | M1: ${r.meta1Volume} (${r.meta1PercentIndividual}%)`);
      });
    }

    // 5. Teste de JOIN - Simular a query do controller
    console.log('\n🔗 5. TESTE DE JOIN (simulando a query do controller):');
    const periodoTeste = periodos.length > 0 ? periodos[0].periodo : null;
    
    if (periodoTeste) {
      const regionaisTeste = await db_all('SELECT id, nome FROM regionais WHERE ativo = 1 LIMIT 3');
      
      for (const regional of regionaisTeste) {
        console.log(`\n   Regional: ${regional.nome} | Período: ${periodoTeste}`);
        
        // Buscar vendedores ativos
        const vendedoresAtivos = await db_all(`
          SELECT id, nome 
          FROM colaboradores 
          WHERE regional_id = ? AND status = 'ativo'
        `, [regional.id]);
        console.log(`   - Vendedores ativos: ${vendedoresAtivos.length}`);
        
        // Buscar vendas de cada vendedor
        for (const vendedor of vendedoresAtivos.slice(0, 2)) {
          const vendas = await db_get(`
            SELECT vendas_volume, vendas_financeiro
            FROM vendas_mensais
            WHERE vendedor_id = ? AND regional_id = ? AND periodo = ?
          `, [vendedor.id, regional.id, periodoTeste]);
          
          console.log(`     ${vendedor.nome}: ${vendas ? `${vendas.vendas_volume} vendas` : 'SEM DADOS'}`);
        }
      }
    }

    console.log('\n✅ Diagnóstico concluído!');
    process.exit(0);

  } catch (erro) {
    console.error('❌ Erro:', erro);
    process.exit(1);
  }
}

// Aguardar banco inicializar
setTimeout(() => {
  diagnosticar();
}, 1000);
