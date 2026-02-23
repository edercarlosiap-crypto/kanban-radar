const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:\\Users\\Uni\\Desktop\\KANBAN\\radar-estrategico-pro\\backend\\database.sqlite');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if(err) console.error(err);
  else {
    console.log('📋 Tabelas existentes no KANBAN:');
    console.table(tables);
  }
  db.close();
});
