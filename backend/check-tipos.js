const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco:', err);
    process.exit(1);
  }
});

const db_all = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function verificarTipos() {
  try {
    const tipos = await db_all(`SELECT DISTINCT tipoMeta FROM regras_comissao ORDER BY tipoMeta`);
    console.log('\n📋 Tipos de Meta no Banco de Dados:\n');
    tipos.forEach((t, i) => {
      console.log(`${i + 1}. "${t.tipoMeta}"`);
    });
    console.log();
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    db.close();
  }
}

verificarTipos();
