const { db_get } = require('./src/config/database');

console.log('🧪 Testando db_get do módulo database.js');
console.log('db_get é uma função?', typeof db_get === 'function');

// Aguardar inicialização do banco (3 segundos)
setTimeout(async () => {
  console.log('\n🔎 Executando query...');
  
  const regionalId = '314bf186-8eb3-4104-9c1d-9477bb8c4691';
  const periodo = 'Dez/25';
  
  try {
    const result = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal,
        pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'vendas'
      LIMIT 1
    `, [regionalId, periodo]);
    
    console.log('\n✅ Resultado:');
    console.log(JSON.stringify(result, null, 2));
    
    if (!result) {
      console.log('\n❌ RESULTADO É UNDEFINED!');
    }
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  }
  
  process.exit(0);
}, 3000);
