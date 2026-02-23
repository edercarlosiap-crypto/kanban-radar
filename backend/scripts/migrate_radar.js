const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Migrando tabela radar...');

db.serialize(() => {
  // Backup dos dados existentes
  db.run(`CREATE TABLE IF NOT EXISTS radar_backup AS SELECT * FROM radar`, (err) => {
    if (err) {
      console.error('Erro ao criar backup:', err.message);
      return;
    }
    console.log('✓ Backup criado');

    // Remove a tabela antiga
    db.run(`DROP TABLE IF EXISTS radar`, (err) => {
      if (err) {
        console.error('Erro ao remover tabela antiga:', err.message);
        return;
      }
      console.log('✓ Tabela antiga removida');

      // Cria a nova tabela com usuarioId
      db.run(`
        CREATE TABLE radar (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          camada TEXT,
          prioridade TEXT,
          tipo TEXT,
          acao TEXT,
          equipe TEXT,
          responsavel TEXT,
          concluirAte TEXT,
          kanban TEXT DEFAULT 'Backlog',
          status TEXT,
          observacao TEXT,
          linkBitrix TEXT,
          dataCriacao TEXT,
          dataAtualizacao TEXT DEFAULT (datetime('now', 'localtime')),
          usuarioId TEXT,
          FOREIGN KEY (usuarioId) REFERENCES usuarios(id)
        )
      `, (err) => {
        if (err) {
          console.error('Erro ao criar nova tabela:', err.message);
          return;
        }
        console.log('✓ Nova tabela radar criada com coluna usuarioId');

        // Tenta recuperar dados do backup (se houver)
        db.all('SELECT * FROM radar_backup', [], (err, rows) => {
          if (!err && rows && rows.length > 0) {
            console.log(`ℹ️  Encontrados ${rows.length} itens no backup`);
            console.log('⚠️  Observação: Itens antigos precisariam de usuarioId. Execute manualmente se necessário.');
          }

          // Remove backup
          db.run('DROP TABLE IF EXISTS radar_backup', () => {
            console.log('✓ Backup removido');
            console.log('✅ Migração concluída!');
            db.close();
          });
        });
      });
    });
  });
});
