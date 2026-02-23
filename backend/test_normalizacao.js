const sqlite3 = require('sqlite3').verbose();

const normalizar = (texto) => {
  return String(texto || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
};

const testes = [
  'Vendedor Padrão',
  'Vendedor Padrao',
  'vendedor padrão',
  'VENDEDOR PADRÃO',
  '  Vendedor  Padrão  ',
  'Vendedor  Padrão'
];

console.log('=== TESTES DE NORMALIZAÇÃO ===');
testes.forEach(t => {
  console.log(`Original: "${t}" -> Normalizado: "${normalizar(t)}"`);
});

const db = new sqlite3.Database('database.db');

db.all('SELECT nome FROM colaboradores WHERE nome LIKE "%Vendedor%" OR nome LIKE "%Padr%"', (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log('\n=== VENDEDORES NO BANCO ===');
    rows.forEach(r => {
      console.log(`DB: "${r.nome}" -> Normalizado: "${normalizar(r.nome)}"`);
    });
  }
  db.close();
});
