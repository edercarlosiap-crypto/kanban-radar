const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

console.log('📊 ESTRUTURA DAS TABELAS DE VALORES\n');

// Verificar estrutura da tabela vendas_mensais
db.get('SELECT * FROM vendas_mensais LIMIT 1', [], (err, row) => {
  if (err) {
    console.error('❌ Erro ao buscar vendas_mensais:', err.message);
  } else {
    console.log('1. VENDAS_MENSAIS:');
    console.log('   Colunas:', Object.keys(row || {}).join(', '));
    if (row) {
      console.log('   Exemplo de registro:');
      console.log('  ', JSON.stringify(row, null, 4));
    }
  }
  console.log();

  // Verificar estrutura da tabela vendas
  db.get('SELECT * FROM vendas LIMIT 1', [], (err, row) => {
    if (err) {
      console.error('❌ Erro ao buscar vendas:', err.message);
    } else {
      console.log('2. VENDAS:');
      console.log('   Colunas:', Object.keys(row || {}).join(', '));
      if (row) {
        console.log('   Exemplo de registro:');
        console.log('  ', JSON.stringify(row, null, 4));
      }
    }
    console.log();

    // Contar registros vendas_mensais
    db.get('SELECT COUNT(*) as total FROM vendas_mensais', [], (err, count1) => {
      console.log('📈 Quantidade de registros:');
      console.log('   vendas_mensais:', count1?.total || 0);

      db.get('SELECT COUNT(*) as total FROM vendas', [], (err, count2) => {
        console.log('   vendas:', count2?.total || 0);
        console.log();

        // Verificar períodos em vendas_mensais
        db.all('SELECT DISTINCT periodo FROM vendas_mensais ORDER BY periodo', [], (err, periodos) => {
          if (!err && periodos && periodos.length > 0) {
            console.log('📅 Períodos em vendas_mensais:');
            periodos.forEach(p => console.log('   -', p.periodo));
          }
          db.close();
        });
      });
    });
  });
});
