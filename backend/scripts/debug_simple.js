require('../src/config/database');
const { db_all, db_get } = require('../src/config/database');

// Dar tempo para as tabelas serem criadas
setTimeout(async () => {
  try {
    console.log('\n=== DEBUG VENDAS MENSAIS ===\n');
    
    // Contar registros
    const count = await db_get("SELECT COUNT(*) as total FROM vendas_mensais");
    console.log(`📊 Total de vendas: ${count?.total || 0}`);
    
    // Ver períodos
    const periodos = await db_all("SELECT DISTINCT periodo FROM vendas_mensais ORDER BY periodo DESC");
    console.log(`\n📅 Períodos encontrados: ${periodos.length}`);
    if (periodos.length > 0) {
      periodos.forEach(p => console.log(`   - "${p.periodo}"`));
    }
    
    // Ver últimos 5 registros
    const amostra = await db_all(
      `SELECT id, periodo, vendedor_id, regional_id, vendas_volume, vendas_financeiro
       FROM vendas_mensais ORDER BY id DESC LIMIT 5`
    );
    console.log(`\n📝 Últimos 5 registros:`);
    console.table(amostra);
    
    // Churn
    const churnCount = await db_get("SELECT COUNT(*) as total FROM churn_regionais");
    console.log(`\n🔴 Total de churn: ${churnCount?.total || 0}`);
    
    const churnRegistros = await db_all(
      "SELECT id, periodo, regional_id, churn FROM churn_regionais ORDER BY id DESC LIMIT 5"
    );
    console.log(`\n🔴 Últimos 5 registros de churn:`);
    console.table(churnRegistros);
    
    console.log('\n=== FIM DEBUG ===\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}, 1000);
