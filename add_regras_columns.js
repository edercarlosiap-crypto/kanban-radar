const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

const columns = [
  { name: 'periodo', type: 'TEXT' },
  { name: 'meta1Incremento', type: 'REAL' },
  { name: 'meta2Incremento', type: 'REAL' },
  { name: 'meta3Incremento', type: 'REAL' }
];

console.log('🔧 Atualizando tabela regras_comissao...\n');

db.serialize(() => {
  columns.forEach((col) => {
    db.run(`ALTER TABLE regras_comissao ADD COLUMN ${col.name} ${col.type}`, (err) => {
      if (err) {
        if (err.message.includes('duplicate column name')) {
          console.log(`ℹ️  Coluna ${col.name} ja existe`);
        } else {
          console.error(`❌ Erro ao adicionar ${col.name}:`, err.message);
        }
      } else {
        console.log(`✅ Coluna ${col.name} adicionada`);
      }
    });
  });

  db.all("PRAGMA table_info(regras_comissao)", [], (err, cols) => {
    if (!err) {
      console.log('\n📋 Estrutura atualizada:');
      console.table(cols.map(c => ({ nome: c.name, tipo: c.type })));
    }
    console.log('\n✅ Ajuste concluido!');
    db.close();
  });
});
