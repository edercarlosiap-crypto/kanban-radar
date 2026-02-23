const { db_get } = require('./src/config/database');

setTimeout(async () => {
  try {
    const regionalId = 'bd402487-06a3-40c3-b206-2fc7bf5d9db4';
    const periodo = 'Dez/25';
    
    console.log('🔎 Testando query de renovação...\n');
    
    // Query exata do backend
    const metaRenovacao = await db_get(`
      SELECT meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'renovação'
    `, [regionalId, periodo]);
    
    console.log('Resultado:');
    console.log(JSON.stringify(metaRenovacao, null, 2));
    
    if (!metaRenovacao) {
      console.log('\n❌ META RENOVAÇÃO NÃO ENCONTRADA!');
      
      // Testar sem LOWER
      console.log('\n🔎 Testando SEM LOWER():');
      const semLower = await db_get(`
        SELECT * FROM regras_comissao
        WHERE regionalId = ? AND periodo = ? AND tipoMeta = 'renovação'
      `, [regionalId, periodo]);
      
      console.log('Resultado SEM LOWER:', semLower ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
      if (semLower) {
        console.log(JSON.stringify(semLower, null, 2));
      }
    }
    
  } catch (error) {
    console.error('Erro:', error);
  }
  
  process.exit(0);
}, 3000);
