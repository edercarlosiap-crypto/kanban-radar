const { db_all } = require('./src/config/database');

console.log('🔍 Buscando regional "ALTA FLORESTA" nas regionais...');

setTimeout(async () => {
  try {
    // Buscar regional
    const regionais = await db_all(`
      SELECT id, nome FROM regionais
      WHERE nome LIKE '%ALTA%'
    `);
    
    console.log('\n📍 Regionais encontradas:');
    regionais.forEach(r => {
      console.log(`  ${r.nome}: ${r.id}`);
    });
    
    if (regionais.length > 0) {
      const regionalId = regionais[0].id;
      console.log(`\n🔎 Buscando regras para: ${regionalId}`);
      
      const regras = await db_all(`
        SELECT tipoMeta, periodo FROM regras_comissao
        WHERE regionalId = ?
      `, [regionalId]);
      
      console.log(`\n📊 Regras encontradas: ${regras.length}`);
      regras.forEach(r => {
        console.log(`  ${r.tipoMeta} | ${r.periodo}`);
      });
      
      // Testar query completa
      console.log('\n🧪 Testando query exata do backend:');
      const metaVendas = await db_all(`
        SELECT * FROM regras_comissao
        WHERE regionalId = ? AND periodo = ? AND tipoMeta = 'Vendas'
      `, [regionalId, 'Dez/25']);
      
      console.log(`Resultado: ${metaVendas.length} registros`);
      if (metaVendas.length > 0) {
        console.log('\n✅ SUCESSO! Registro encontrado:');
        console.log(JSON.stringify(metaVendas[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('Erro:', error);
  }
  
  process.exit(0);
}, 3000);
