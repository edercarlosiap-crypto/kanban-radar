const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco:', err);
    process.exit(1);
  }
});

const db_all = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function testarRelatorioMetas() {
  try {
    console.log('\n📊 TESTE DO RELATÓRIO DE METAS INDIVIDUALIZADAS\n');
    console.log('='.repeat(140));

    // Busca regionais
    const regionaisQuery = `SELECT id, nome FROM regionais ORDER BY nome`;
    const regionais = await db_all(regionaisQuery);

    // Busca colaboradores
    const colabQuery = `SELECT id, nome, regional_id FROM colaboradores`;
    const colaboradores = await db_all(colabQuery);

    // Busca regras
    const regrasQuery = `
      SELECT 
        id, 
        regionalId, 
        tipoMeta, 
        periodo,
        meta1Volume, meta1Percent,
        meta2Volume, meta2Percent,
        meta3Volume, meta3Percent,
        incrementoGlobal
      FROM regras_comissao
      ORDER BY regionalId, tipoMeta
    `;
    const regras = await db_all(regrasQuery);

    // Conta colaboradores por regional
    const colaboradoresPorRegional = {};
    colaboradores.forEach(colab => {
      if (!colaboradoresPorRegional[colab.regional_id]) {
        colaboradoresPorRegional[colab.regional_id] = [];
      }
      colaboradoresPorRegional[colab.regional_id].push(colab);
    });

    // Testa cada regional
    regionais.forEach(regional => {
      const totalVendedores = colaboradoresPorRegional[regional.id]?.length || 0;
      const metasRegional = regras.filter(r => r.regionalId === regional.id);

      console.log(`\n🏢 ${regional.nome}`);
      console.log(`   Total de Vendedores: ${totalVendedores}`);

      if (metasRegional.length === 0) {
        console.log('   ⚠️  Nenhuma meta cadastrada para esta regional');
        return;
      }

      metasRegional.slice(0, 2).forEach(meta => {  // Mostra apenas as 2 primeiras metas
        console.log(`\n   📌 ${meta.tipoMeta} - ${meta.periodo}`);
        console.log(`      Incremento Global: ${(meta.incrementoGlobal * 100)}%`);

        // Meta Nível 1
        const metaInd1 = totalVendedores > 0 
          ? (meta.meta1Volume / totalVendedores) * (1 + meta.incrementoGlobal)
          : 0;
        console.log(`      Meta Nível 1: ${meta.meta1Volume} ÷ ${totalVendedores} × ${(1 + meta.incrementoGlobal).toFixed(2)} = ${metaInd1.toFixed(2)} com ${(meta.meta1Percent * 100).toFixed(2)}%`);

        // Meta Nível 2
        const metaInd2 = totalVendedores > 0 
          ? (meta.meta2Volume / totalVendedores) * (1 + meta.incrementoGlobal)
          : 0;
        console.log(`      Meta Nível 2: ${meta.meta2Volume} ÷ ${totalVendedores} × ${(1 + meta.incrementoGlobal).toFixed(2)} = ${metaInd2.toFixed(2)} com ${(meta.meta2Percent * 100).toFixed(2)}%`);

        // Meta Nível 3
        const metaInd3 = totalVendedores > 0 
          ? (meta.meta3Volume / totalVendedores) * (1 + meta.incrementoGlobal)
          : 0;
        console.log(`      Meta Nível 3: ${meta.meta3Volume} ÷ ${totalVendedores} × ${(1 + meta.incrementoGlobal).toFixed(2)} = ${metaInd3.toFixed(2)} com ${(meta.meta3Percent * 100).toFixed(2)}%`);
      });
    });

    console.log('\n' + '='.repeat(140) + '\n');
    console.log('✅ Teste de cálculos concluído!\n');

  } catch (error) {
    console.error('Erro ao testar relatório:', error);
  } finally {
    db.close();
  }
}

testarRelatorioMetas();
