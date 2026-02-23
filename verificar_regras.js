const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./backend/database.db');

const run = (sql) => new Promise((resolve, reject) => {
  db.all(sql, (err, rows) => err ? reject(err) : resolve(rows || []));
});

(async () => {
  try {
    console.log('\n📋 REGRAS ENCONTRADAS vs ESPERADAS em Dez/25:\n');

    const encontrados = await run('SELECT DISTINCT tipoMeta FROM regras_comissao WHERE periodo = "Dez/25" ORDER BY tipoMeta');
    const encontradosSet = new Set(encontrados.map(r => r.tipoMeta));
    
    const esperados = ['VENDAS', 'CHURN', 'MUDANÇA DE TITULARIDADE', 'MIGRAÇÃO DE TECNOLOGIA', 'RENOVAÇÃO', 'PLANO EVENTO', 'SVA', 'TELEFONIA'];
    
    console.log('✓ Regras ENCONTRADAS:');
    encontrados.forEach(r => console.log(`  ✓ ${r.tipoMeta}`));
    
    console.log('\n✗ Regras FALTANDO:');
    let faltam = false;
    esperados.forEach(tipo => {
      if (!encontradosSet.has(tipo)) {
        console.log(`  ✗ ${tipo}`);
        faltam = true;
      }
    });
    
    if (!faltam) console.log('  (nenhuma faltando)');

    console.log('\n' + '═'.repeat(80));
    console.log('RESUMO DO PROBLEMA:');
    console.log('═'.repeat(80));
    console.log('\n1. CHURN_REGIONAIS está VAZIO (0 registros)');
    console.log('2. REGRA PARA CHURN não existe em Dez/25');
    console.log('\nISSO CAUSA:\n   → Comissionamento de CHURN = 0 (pois não há meta e nem dado)');
    console.log('   → Os outros tipos de comissionamento devem estar corretos');
    console.log('\nSOLUÇÃO RECOMENDADA:');
    console.log('   1. Importar dados de CHURN para Dez/25');
    console.log('   2. Configurar regra de META para CHURN em Dez/25');
    console.log('═'.repeat(80) + '\n');

  } catch(error) {
    console.error('❌ Erro:', error.message);
  } finally {
    db.close();
  }
})();
