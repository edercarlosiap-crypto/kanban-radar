const { db_all } = require('./src/config/database');

setTimeout(async () => {
  try {
    console.log('🔍 Buscando UUID incorreto: 314bf186-8eb3-4104-9c1d-9477bb8c4691\n');
    
    // Verificar se existe em regionais
    const regional = await db_all(`
      SELECT * FROM regionais WHERE id = '314bf186-8eb3-4104-9c1d-9477bb8c4691'
    `);
    
    if (regional.length > 0) {
      console.log('✅ Encontrado em regionais:');
      console.log(JSON.stringify(regional[0], null, 2));
    } else {
      console.log('❌ NÃO encontrado em regionais');
    }
    
    // Verificar se existe em regras
    const regras = await db_all(`
      SELECT * FROM regras_comissao WHERE regionalId = '314bf186-8eb3-4104-9c1d-9477bb8c4691'
    `);
    
    console.log(`\n📊 Regras com este UUID: ${regras.length}`);
    
    // Listar todas as regionais
    console.log('\n📍 Todas as regionais no banco:');
    const todas = await db_all('SELECT id, nome FROM regionais ORDER BY nome');
    todas.forEach(r => {
      console.log(`  ${r.nome}: ${r.id}`);
    });
    
  } catch (error) {
    console.error('Erro:', error);
  }
  
  process.exit(0);
}, 3000);
