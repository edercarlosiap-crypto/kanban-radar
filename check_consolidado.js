const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

console.log('📊 VERIFICANDO DADOS PARA RELATÓRIO CONSOLIDADO\n');

// 1. Verificar regionais
db.all('SELECT id, nome FROM regionais ORDER BY nome', [], (err, regionais) => {
  if (err) {
    console.error('❌ Erro ao buscar regionais:', err.message);
    db.close();
    return;
  }

  console.log(`✅ ${regionais.length} regionais encontradas:`);
  regionais.forEach(r => console.log(`   - ${r.nome} (${r.id})`));
  console.log();

  // 2. Para cada regional, verificar vendedores ativos
  let promisesVendedores = regionais.map(regional => {
    return new Promise((resolve) => {
      db.all(
        'SELECT id, nome, cpf FROM colaboradores WHERE regional_id = ? AND status = "ativo"',
        [regional.id],
        (err, vendedores) => {
          if (err) {
            console.error(`❌ Erro ao buscar vendedores da regional ${regional.nome}:`, err.message);
            resolve({ regional: regional.nome, vendedores: [] });
          } else {
            resolve({ regional: regional.nome, vendedores });
          }
        }
      );
    });
  });

  Promise.all(promisesVendedores).then(resultados => {
    console.log('👥 VENDEDORES ATIVOS POR REGIONAL:');
    resultados.forEach(r => {
      console.log(`   ${r.regional}: ${r.vendedores.length} vendedor(es)`);
      if (r.vendedores.length > 0) {
        r.vendedores.slice(0, 3).forEach(v => console.log(`      • ${v.nome}`));
        if (r.vendedores.length > 3) {
          console.log(`      ... e mais ${r.vendedores.length - 3}`);
        }
      }
    });
    console.log();

    // 3. Verificar regras de comissão
    db.all('SELECT DISTINCT periodo, regionalId FROM regras_comissao ORDER BY periodo', [], (err, regras) => {
      if (err) {
        console.error('❌ Erro ao buscar regras:', err.message);
        db.close();
        return;
      }

      console.log(`📋 REGRAS DE COMISSÃO CADASTRADAS:`);
      console.log(`   Total de combinações período/regional: ${regras.length}`);
      
      // Agrupar por período
      const porPeriodo = {};
      regras.forEach(r => {
        if (!porPeriodo[r.periodo]) porPeriodo[r.periodo] = [];
        porPeriodo[r.periodo].push(r.regionalId);
      });

      console.log('   Por período:');
      Object.keys(porPeriodo).forEach(periodo => {
        console.log(`      ${periodo}: ${porPeriodo[periodo].length} regional(is)`);
      });
      console.log();

      // 4. Verificar metas cadastradas
      db.all('SELECT DISTINCT periodo FROM metas ORDER BY periodo', [], (err, periodos) => {
        if (err) {
          console.error('❌ Erro ao buscar metas:', err.message);
          db.close();
          return;
        }

        console.log(`🎯 METAS CADASTRADAS:`);
        if (periodos.length === 0) {
          console.log('   ⚠️ NENHUMA META CADASTRADA!');
        } else {
          periodos.forEach(p => console.log(`   - ${p.periodo}`));
        }
        console.log();

        db.close();
        
        console.log('✅ Verificação concluída!');
      });
    });
  });
});
