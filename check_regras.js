const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.db');

// Buscar regras de renovação
db.all("SELECT DISTINCT tipoMeta FROM regras_comissao ORDER BY tipoMeta", [], (err, tipos) => {
  if (err) {
    console.error('Erro:', err);
    db.close();
    return;
  }
  
  console.log('=== TIPOS DE META ===');
  if (tipos) {
    tipos.forEach(t => console.log('- ' + t.tipoMeta));
  }
  
  // Buscar regras de RENOVAÇÃO
  db.all("SELECT * FROM regras_comissao WHERE tipoMeta = 'RENOVAÇÃO' ORDER BY periodo DESC", [], (err2, regras) => {
    if (err2) {
      console.error('Erro:', err2);
    } else {
      console.log('\n=== REGRAS DE RENOVAÇÃO ===');
      if (regras && regras.length > 0) {
        regras.forEach(r => {
          console.log(`\nPeríodo: ${r.periodo} | Regional: ${r.regionalId}`);
          console.log(`  Meta1: ${r.meta1Volume} unidades = ${r.meta1Percent}%`);
          console.log(`  Meta2: ${r.meta2Volume} unidades = ${r.meta2Percent}%`);
          console.log(`  Meta3: ${r.meta3Volume} unidades = ${r.meta3Percent}%`);
        });
      } else {
        console.log('Nenhuma regra de renovação encontrada');
      }
    }
    db.close();
  });
});
