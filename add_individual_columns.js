const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');

console.log('=== ADICIONANDO COLUNAS DE PERCENTUAL INDIVIDUAL ===\n');

// Adicionar as 3 colunas
db.run('ALTER TABLE regras_comissao ADD COLUMN meta1PercentIndividual REAL DEFAULT 0', (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('Erro ao adicionar meta1PercentIndividual:', err.message);
  } else {
    console.log('✅ meta1PercentIndividual adicionada');
  }
});

db.run('ALTER TABLE regras_comissao ADD COLUMN meta2PercentIndividual REAL DEFAULT 0', (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('Erro ao adicionar meta2PercentIndividual:', err.message);
  } else {
    console.log('✅ meta2PercentIndividual adicionada');
  }
});

db.run('ALTER TABLE regras_comissao ADD COLUMN meta3PercentIndividual REAL DEFAULT 0', (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('Erro ao adicionar meta3PercentIndividual:', err.message);
  } else {
    console.log('✅ meta3PercentIndividual adicionada');
  }
  
  // Após adicionar as colunas, atualizar os registros de VENDAS
  setTimeout(() => {
    db.run(`
      UPDATE regras_comissao
      SET 
        meta1PercentIndividual = 1,
        meta2PercentIndividual = 0.5,
        meta3PercentIndividual = 0.3
      WHERE LOWER(tipoMeta) = 'vendas'
    `, function(err) {
      if (err) {
        console.error('\nErro ao atualizar regras de vendas:', err.message);
      } else {
        console.log(`\n✅ ${this.changes} regras de VENDAS atualizadas com percentuais individuais`);
      }
      db.close();
    });
  }, 500);
});
