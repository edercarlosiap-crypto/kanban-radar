const { db_all } = require('./src/config/database');

setTimeout(async () => {
  try {
    console.log('🔍 Buscando regras de comissão para Dez/25...\n');
    
    const rules = await db_all(`
      SELECT regionalId, tipoMeta, periodo, meta1Volume, meta2Volume, meta3Volume
      FROM regras_comissao
      WHERE periodo = 'Dez/25'
      ORDER BY regionalId, tipoMeta
      LIMIT 20
    `);
    
    console.table(rules);
    
    console.log('\n🔍 Verificando se existe tipo "GLOBAL" ou similar...\n');
    
    const globalRules = await db_all(`
      SELECT *
      FROM regras_comissao
      WHERE LOWER(tipoMeta) LIKE '%global%'
      LIMIT 5
    `);
    
    if (globalRules.length > 0) {
      console.log('✅ Encontradas regras GLOBAIS:');
      console.table(globalRules);
    } else {
      console.log('❌ Nenhuma regra com tipo "GLOBAL" encontrada');
      console.log('\n💡 Sugestão: As metas GLOBAIS podem precisar ser criadas ou');
      console.log('   podem estar em um campo separado (ex: metaGlobal1, metaGlobal2, metaGlobal3)');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  process.exit(0);
}, 3000);
