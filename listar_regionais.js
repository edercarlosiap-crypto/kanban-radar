const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('\n📍 TODAS AS REGIONAIS NO BANCO:\n');

db.all('SELECT id, nome FROM regionais ORDER BY nome', (err, regionais) => {
  if (regionais && regionais.length > 0) {
    regionais.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.nome}`);
      console.log(`     ID: ${r.id}`);
    });
  }
  
  console.log('\n');
  
  // Verificar especificamente Alta Floresta Doeste
  db.get(
    "SELECT * FROM regionais WHERE LOWER(nome) LIKE '%alta floresta%'",
    (err, regional) => {
      if (regional) {
        console.log('✅ Alta Floresta Doeste ENCONTRADA!');
        console.log(`   Nome: ${regional.nome}`);
        console.log(`   ID: ${regional.id}`);
      } else {
        console.log('❌ Alta Floresta Doeste NÃO ENCONTRADA');
      }
      console.log('');
      db.close();
    }
  );
});
