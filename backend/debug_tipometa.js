const { db_all } = require('./src/config/database');

setTimeout(async () => {
  try {
    const regionalId = 'bd402487-06a3-40c3-b206-2fc7bf5d9db4';
    
    // Buscar valor exato do tipoMeta
    const regras = await db_all(`
      SELECT tipoMeta, 
             LOWER(tipoMeta) as tipoMeta_lower,
             LENGTH(tipoMeta) as tamanho,
             TYPEOF(tipoMeta) as tipo
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = 'Dez/25'
    `, [regionalId]);
    
    console.log('📋 Valores de tipoMeta:');
    regras.forEach(r => {
      console.log(`\n  Valor original: "${r.tipoMeta}"`);
      console.log(`  LOWER(): "${r.tipoMeta_lower}"`);
      console.log(`  Tamanho: ${r.tamanho}`);
      console.log(`  Tipo: ${r.tipo}`);
      
      // Verificar caracteres especiais
      const bytes = [];
      for (let i = 0; i < r.tipoMeta.length; i++) {
        bytes.push(r.tipoMeta.charCodeAt(i));
      }
      console.log(`  Códigos: ${bytes.join(', ')}`);
    });
    
    // Testar várias variações
    console.log('\n\n🧪 Testando variações de busca:');
    
    const tests = [
      { desc: 'vendas (minúsculo)', query: "tipoMeta = 'vendas'" },
      { desc: 'Vendas (maiúsculo)', query: "tipoMeta = 'Vendas'" },
      { desc: 'VENDAS (maiúsculo)', query: "tipoMeta = 'VENDAS'" },
      { desc: 'LOWER = vendas', query: "LOWER(tipoMeta) = 'vendas'" },
      { desc: 'LIKE vendas', query: "tipoMeta LIKE '%vendas%'" },
    ];
    
    for (const test of tests) {
      const result = await db_all(`
        SELECT COUNT(*) as total FROM regras_comissao
        WHERE regionalId = ? AND periodo = 'Dez/25' AND ${test.query}
      `, [regionalId]);
      
      console.log(`  ${test.desc}: ${result[0].total} registro(s)`);
    }
    
  } catch (error) {
    console.error('Erro:', error);
  }
  
  process.exit(0);
}, 3000);
