const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

console.log('🧹 Limpando colaboradores antigos sem função...\n');

db.serialize(() => {
    // Ver quantos colaboradores existem
    db.get('SELECT COUNT(*) as total FROM colaboradores', [], (err, row) => {
        if (!err) {
            console.log(`📊 Total de colaboradores antes: ${row.total}`);
        }
        
        // Deletar todos os colaboradores
        db.run('DELETE FROM colaboradores', [], function(err) {
            if (err) {
                console.error('❌ Erro ao deletar:', err.message);
                db.close();
                return;
            }
            
            console.log(`✅ ${this.changes} colaboradores removidos`);
            
            // Verificar resultado
            db.get('SELECT COUNT(*) as total FROM colaboradores', [], (err2, row2) => {
                if (!err2) {
                    console.log(`📊 Total de colaboradores agora: ${row2.total}`);
                }
                
                console.log('\n✅ Limpeza concluída!');
                console.log('💡 Agora você pode cadastrar novos colaboradores com função pelo frontend.');
                db.close();
            });
        });
    });
});
