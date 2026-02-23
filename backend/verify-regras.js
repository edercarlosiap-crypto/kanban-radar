const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco:', err);
    process.exit(1);
  }
});

// Promisify para facilitar async/await
const db_all = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function verificarRegras() {
  try {
    console.log('\n📋 VERIFICANDO REGRAS DE COMISSÃO NO BANCO DE DADOS\n');
    console.log('='.repeat(120));

    // Busca todas as regras com o nome da regional
    const query = `
      SELECT 
        r.id,
        r.regionalId,
        reg.nome as regionalNome,
        r.tipoMeta,
        r.periodo,
        r.meta1Volume,
        r.meta1Percent,
        r.meta2Volume,
        r.meta2Percent,
        r.meta3Volume,
        r.meta3Percent,
        r.incrementoGlobal,
        r.pesoVendasChurn
      FROM regras_comissao r
      LEFT JOIN regionais reg ON r.regionalId = reg.id
      ORDER BY reg.nome, r.tipoMeta, r.periodo
    `;

    const regras = await db_all(query);

    if (regras.length === 0) {
      console.log('\n⚠️  Nenhuma regra encontrada no banco!\n');
      db.close();
      return;
    }

    console.log(`\n✅ Total de ${regras.length} regras encontradas:\n`);

    regras.forEach((r, index) => {
      console.log(`${index + 1}. Regional: ${r.regionalNome} | Tipo: ${r.tipoMeta} | Período: ${r.periodo}`);
      console.log(`   Meta 1: ${r.meta1Volume} unidades → ${(r.meta1Percent * 100).toFixed(2)}%`);
      console.log(`   Meta 2: ${r.meta2Volume} unidades → ${(r.meta2Percent * 100).toFixed(2)}%`);
      console.log(`   Meta 3: ${r.meta3Volume} unidades → ${(r.meta3Percent * 100).toFixed(2)}%`);
      console.log(`   Incremento Global: ${(r.incrementoGlobal * 100).toFixed(2)}% | Peso Vendas/Churn: ${(r.pesoVendasChurn * 100).toFixed(2)}%`);
      console.log('-'.repeat(120));
    });

    // Resumo por regional
    console.log('\n📊 RESUMO POR REGIONAL:\n');
    const porRegional = {};
    regras.forEach(r => {
      if (!porRegional[r.regionalNome]) {
        porRegional[r.regionalNome] = [];
      }
      porRegional[r.regionalNome].push({
        tipo: r.tipoMeta,
        periodo: r.periodo
      });
    });

    Object.entries(porRegional).forEach(([regional, dados]) => {
      console.log(`\n${regional}:`);
      dados.forEach(d => {
        console.log(`  • ${d.tipo} - ${d.periodo}`);
      });
    });

    console.log('\n' + '='.repeat(120) + '\n');

  } catch (error) {
    console.error('Erro ao verificar regras:', error);
  } finally {
    db.close();
  }
}

verificarRegras();
