const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const paths = [
  path.resolve(__dirname, '../../database.sqlite'),
  path.resolve(__dirname, '../database.sqlite')
];

const listTables = (dbPath) => new Promise((resolve) => {
  const db = new sqlite3.Database(dbPath);
  db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
    if (err) {
      console.error(`${dbPath} -> ${err.message}`);
      db.close();
      resolve([]);
      return;
    }
    console.log(`\nTables in ${dbPath}:`);
    rows.forEach((r) => console.log(`- ${r.name}`));
    db.close();
    resolve(rows.map((r) => r.name));
  });
});

const listResponsaveis = (dbPath) => new Promise((resolve) => {
  const db = new sqlite3.Database(dbPath);
  db.all(
    'SELECT responsavel, COUNT(*) as total, LENGTH(responsavel) as len, hex(responsavel) as hex FROM radar GROUP BY responsavel ORDER BY total DESC',
    [],
    (err, rows) => {
      if (err) {
        console.error(`${dbPath} -> ${err.message}`);
        db.close();
        resolve(false);
        return;
      }
      console.log(`\nResponsaveis in ${dbPath}:`);
      console.log('Responsavel | Total | Len | Hex');
      rows.forEach((r) => {
        const nome = r.responsavel === null ? '(null)' : r.responsavel;
        console.log(`${nome} | ${r.total} | ${r.len} | ${r.hex}`);
      });
      db.close();
      resolve(true);
    }
  );
});

(async () => {
  for (const dbPath of paths) {
    const tables = await listTables(dbPath);
    if (tables.includes('radar')) {
      await listResponsaveis(dbPath);
    }
  }
})();
