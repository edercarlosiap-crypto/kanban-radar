const { db_all } = require('./src/config/database');

console.log('🧪 Testando busca de todas as regras');

setTimeout(async () => {
  try {
    const todasRegras = await db_all(`
      SELECT tipoMeta, regionalId, periodo, COUNT(*) as total
      FROM regras_comissao
      GROUP BY tipoMeta, regionalId, periodo
      ORDER BY tipoMeta
    `);
    
    console.log('\n📊 Total de grupos:', todasRegras.length);
    console.log('\nPrimeiras 10 entradas:');
    todasRegras.slice(0, 10).forEach(r => {
      console.log(`  ${r.tipoMeta} | ${r.regionalId.substring(0,8)}... | ${r.periodo} | ${r.total}`);
    });
    
    // Testar busca específica com LOWER()
    console.log('\n🔎 Testando query com LOWER():');
    const comLower = await db_all(`
      SELECT * FROM regras_comissao
      WHERE regionalId = '314bf186-8eb3-4104-9c1d-9477bb8c4691'
        AND periodo = 'Dez/25'
        AND LOWER(tipoMeta) = 'vendas'
    `);
    console.log('Resultado com LOWER():', comLower.length, 'registros');
    
    // Testar sem LOWER()
    console.log('\n🔎 Testando query SEM LOWER():');
    const semLower = await db_all(`
      SELECT * FROM regras_comissao
      WHERE regionalId = '314bf186-8eb3-4104-9c1d-9477bb8c4691'
        AND periodo = 'Dez/25'
        AND tipoMeta = 'Vendas'
    `);
    console.log('Resultado SEM LOWER():', semLower.length, 'registros');
    
    if (semLower.length > 0) {
      console.log('\n✅ ENCONTRADO! Primeiro registro:');
      console.log(JSON.stringify(semLower[0], null, 2));
    }
    
  } catch (error) {
    console.error('Erro:', error);
  }
  
  process.exit(0);
}, 3000);
