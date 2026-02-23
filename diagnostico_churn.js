const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./backend/database.db');

const run = (sql) => new Promise((resolve, reject) => {
  db.all(sql, (err, rows) => err ? reject(err) : resolve(rows || []));
});

(async () => {
  try {
    console.log('\n' + '='.repeat(100));
    console.log('🔍 DIAGNÓSTICO: Comparação de dados disponíveis');
    console.log('='.repeat(100) + '\n');

    console.log('1️⃣ CHURN_REGIONAIS:');
    let result = await run('SELECT COUNT(*) as total FROM churn_regionais');
    console.log(`   Total de registros: ${result[0].total}`);
    
    if (result[0].total > 0) {
      result = await run('SELECT DISTINCT periodo FROM churn_regionais');
      console.log(`   Períodos: ${result.map(r => r.periodo).join(', ')}`);
    } else {
      console.log('   ❌ TABELA VAZIA - Dados de CHURN não foram importados!');
    }

    console.log('\n2️⃣ VENDAS_MENSAIS (Dez/25):');
    result = await run('SELECT COUNT(*) as total FROM vendas_mensais WHERE periodo = "Dez/25"');
    console.log(`   Registros: ${result[0].total}`);
    
    // Verificar quantos vendedores têm dados
    result = await run('SELECT COUNT(DISTINCT vendedor_id) as vendedores FROM vendas_mensais WHERE periodo = "Dez/25"');
    console.log(`   Vendedores com dados: ${result[0].vendedores}`);

    console.log('\n3️⃣ REGRAS_COMISSAO (Dez/25):');
    result = await run('SELECT tipoMeta, COUNT(*) as qtd FROM regras_comissao WHERE periodo = "Dez/25" GROUP BY tipoMeta ORDER BY tipoMeta');
    result.forEach(r => {
      console.log(`   ${r.tipoMeta.padEnd(25)} : ${r.qtd} regra(s)`);
    });

    console.log('\n4️⃣ Análise de um vendedor específico em Dez/25:');
    result = await run(`
      SELECT vendedor_id, nome, regional_id 
      FROM vendas_mensais vm
      JOIN colaboradores c ON c.id = vm.vendedor_id
      WHERE vm.periodo = "Dez/25"
      LIMIT 1
    `);

    if (result.length > 0) {
      const vendedor = result[0];
      console.log(`   Vendedor: ${vendedor.nome} (ID: ${vendedor.vendedor_id})`);
      
      // Buscar dados desse vendedor
      let dados = await run(`
        SELECT vendas_volume, renovacao_volume, migracao_tecnologia_volume, 
               mudanca_titularidade_volume, plano_evento_volume, sva_volume, telefonia_volume
        FROM vendas_mensais
        WHERE vendedor_id = '${vendedor.vendedor_id}' AND periodo = 'Dez/25'
      `);

      if (dados.length > 0) {
        console.log('\n   Dados de Vendas em Dez/25:');
        Object.entries(dados[0]).forEach(([key, val]) => {
          console.log(`     ${key.padEnd(35)} : ${val || 0}`);
        });
      }

      // Buscar churn desse vendedor
      const churnData = await run(`
        SELECT churn FROM churn_regionais 
        WHERE regional_id = '${vendedor.regional_id}' AND periodo = 'Dez/25'
      `);
      
      console.log(`\n   Dados de CHURN em Dez/25:`);
      if (churnData.length > 0) {
        console.log(`     churn: ${churnData[0].churn}`);
      } else {
        console.log(`     ❌ SEM DADOS - O campo de CHURN está vazio!`);
      }
    }

    console.log('\n' + '='.repeat(100));
    console.log('⚠️  CONCLUSÃO:');
    console.log('═'.repeat(100));
    console.log(`O problema é que CHURN_REGIONAIS está vazio.`);
    console.log(`Para calcular COMISSIONAMENTO DE CHURN corretamente, é necessário:`);
    console.log(`  1. Importar dados de CHURN para Dez/25`);
    console.log(`  2. OU usar TELEFONICA_VOLUME como aproximação para CHURN`);
    console.log(`  3. OU verificar se CHURN deve vir de outra fonte`);
    console.log('='.repeat(100) + '\n');

  } catch(error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  } finally {
    db.close();
  }
})();
