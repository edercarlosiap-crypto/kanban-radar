const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function teste() {
  try {
    console.log('\n' + '='.repeat(120));
    console.log('🔍 ANÁLISE DETALHADA: ESTRUTURA DE DADOS');
    console.log('='.repeat(120) + '\n');

    // 1) Verificar tabelas disponíveis
    console.log('📋 Tabelas disponíveis para CHURN:\n');
    const tables = await run(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND (
        name LIKE '%churn%' OR 
        name LIKE '%vendas%' OR
        name LIKE '%meta%'
      ) ORDER BY name
    `);
    
    tables.forEach(t => console.log(`  ✓ ${t.name}`));

    // 2) Verificar schema das tabelas importantes
    console.log('\n📊 Schema de CHURN_REGIONAIS:');
    let schema = await run('PRAGMA table_info(churn_regionais)');
    schema.forEach(col => console.log(`  - ${col.name.padEnd(30)} (${col.type})`));

    console.log('\n📊 Schema de VENDAS_MENSAIS:');
    schema = await run('PRAGMA table_info(vendas_mensais)');
    schema.forEach(col => console.log(`  - ${col.name.padEnd(30)} (${col.type})`));

    console.log('\n📊 Schema de REGRAS_COMISSAO:');
    schema = await run('PRAGMA table_info(regras_comissao)');
    schema.forEach(col => console.log(`  - ${col.name.padEnd(30)} (${col.type})`));

    // 3) Buscar um exemplo de cada tabela para período Dez/25
    console.log('\n' + '─'.repeat(120));
    console.log('📝 EXEMPLO DE DADOS REAIS (Dez/25)\n');

    const vendorSample = await run(`
      SELECT * FROM vendas_mensais 
      WHERE periodo = 'Dez/25'
      LIMIT 1
    `);

    if (vendorSample.length > 0) {
      console.log('✓ VENDAS_MENSAIS (primeira linha):');
      Object.entries(vendorSample[0]).forEach(([key, val]) => {
        console.log(`  ${key.padEnd(35)} = ${val}`);
      });
    } else {
      console.log('❌ Nenhum dado em VENDAS_MENSAIS');
    }

    const churnSample = await run(`
      SELECT * FROM churn_regionais 
      WHERE periodo = 'Dez/25'
      LIMIT 1
    `);

    if (churnSample.length > 0) {
      console.log('\n✓ CHURN_REGIONAIS (primeira linha):');
      Object.entries(churnSample[0]).forEach(([key, val]) => {
        console.log(`  ${key.padEnd(35)} = ${val}`);
      });
    } else {
      console.log('\n❌ Nenhum dado em CHURN_REGIONAIS');
    }

    const rulasSample = await run(`
      SELECT * FROM regras_comissao 
      WHERE periodo = 'Dez/25' AND tipo_meta = 'VENDAS'
      LIMIT 1
    `);

    if (rulasSample.length > 0) {
      console.log('\n✓ REGRAS_COMISSAO - VENDAS (primeira linha):');
      Object.entries(rulasSample[0]).forEach(([key, val]) => {
        console.log(`  ${key.padEnd(35)} = ${val}`);
      });
    }

    // 4) Análise: Contar registros por tipo_meta
    console.log('\n' + '─'.repeat(120));
    console.log('📊 CONTAGEM DE REGRAS POR TIPO_META\n');
    
    const counts = await run(`
      SELECT tipo_meta, COUNT(*) as qtd 
      FROM regras_comissao 
      WHERE periodo = 'Dez/25'
      GROUP BY tipo_meta
      ORDER BY tipo_meta
    `);

    counts.forEach(c => {
      console.log(`  ${c.tipo_meta.padEnd(20)} : ${c.qtd} regra(s)`);
    });

    // 5) Verificar campos específicos na tabela de REGRAS
    console.log('\n' + '─'.repeat(120));
    console.log('🔎 CAMPOS DE META NA TABELA REGRAS_COMISSAO\n');
    
    const campos = await run(`
      SELECT DISTINCT 
        CASE WHEN meta1Volume IS NOT NULL THEN '✓ meta1Volume' ELSE '✗ meta1Volume' END,
        CASE WHEN meta1Percent IS NOT NULL THEN '✓ meta1Percent' ELSE '✗ meta1Percent' END,
        CASE WHEN incrementoGlobal IS NOT NULL THEN '✓ incrementoGlobal' ELSE '✗ incrementoGlobal' END,
        CASE WHEN pesoVendasChurn IS NOT NULL THEN '✓ pesoVendasChurn' ELSE '✗ pesoVendasChurn' END
      FROM regras_comissao
      WHERE periodo = 'Dez/25'
      LIMIT 1
    `);

    if (campos.length > 0) {
      const c = campos[0];
      console.log(`  ${Object.values(c).join('  ')}`);
    }

    console.log('\n' + '='.repeat(120));

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    db.close();
  }
}

teste();
