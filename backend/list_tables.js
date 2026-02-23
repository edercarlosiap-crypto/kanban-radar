const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

console.log('\n=== TABELAS NO BANCO COMISSIONAMENTO ===\n');

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, rows) => {
  if (err) {
    console.error('Erro:', err.message);
  } else {
    console.log(`Total: ${rows.length} tabelas\n`);
    rows.forEach(row => console.log('  -', row.name));
    
    const comissionamentoTables = rows.filter(r => 
      r.name.includes('comissao') || 
      r.name.includes('vend') ||
      r.name.includes('regional') ||
      r.name.includes('colabor') ||
      r.name.includes('regra') ||
      r.name.includes('meta')
    );
    
    console.log('\n=== TABELAS PARA COMISSIONAMENTO ===');
    comissionamentoTables.forEach(t => console.log('  ✓', t.name));
  }
  db.close();
});
