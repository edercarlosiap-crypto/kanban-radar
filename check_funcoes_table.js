const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

console.log('🔍 Verificando tabelas no banco de dados...\n');

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, tables) => {
    if (err) {
        console.error('❌ Erro ao listar tabelas:', err);
        db.close();
        return;
    }

    console.log('📋 Tabelas encontradas:');
    tables.forEach(t => console.log(`  - ${t.name}`));
    
    // Verificar especificamente a tabela funcoes
    const hasFuncoes = tables.some(t => t.name === 'funcoes');
    
    if (hasFuncoes) {
        console.log('\n✅ Tabela "funcoes" existe');
        
        // Ver estrutura da tabela
        db.all("PRAGMA table_info(funcoes)", [], (err, cols) => {
            if (!err) {
                console.log('\n📊 Estrutura da tabela funcoes:');
                console.table(cols);
            }
            
            // Ver dados
            db.all("SELECT * FROM funcoes", [], (err, rows) => {
                if (!err) {
                    console.log(`\n📝 Total de registros: ${rows.length}`);
                    if (rows.length > 0) {
                        console.table(rows);
                    }
                }
                db.close();
            });
        });
    } else {
        console.log('\n❌ Tabela "funcoes" NÃO existe!');
        console.log('\n💡 É necessário criar a tabela funcoes no banco de dados');
        db.close();
    }
});
