const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

console.log('🔧 Adicionando coluna funcao_id na tabela colaboradores...\n');

db.serialize(() => {
    // Adicionar coluna funcao_id
    db.run('ALTER TABLE colaboradores ADD COLUMN funcao_id TEXT', (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('ℹ️  Coluna funcao_id já existe');
            } else {
                console.error('❌ Erro ao adicionar coluna:', err.message);
                db.close();
                return;
            }
        } else {
            console.log('✅ Coluna funcao_id adicionada');
        }

        // Adicionar coluna data_criacao se não existir
        db.run('ALTER TABLE colaboradores ADD COLUMN data_criacao TEXT', (err2) => {
            if (err2 && !err2.message.includes('duplicate column name')) {
                console.error('⚠️  Erro ao adicionar data_criacao:', err2.message);
            } else if (!err2) {
                console.log('✅ Coluna data_criacao adicionada');
            }

            // Verificar estrutura final
            console.log('\n📋 Estrutura atualizada:');
            db.all("PRAGMA table_info(colaboradores)", [], (err3, cols) => {
                if (!err3) {
                    console.table(cols.map(c => ({ 
                        nome: c.name, 
                        tipo: c.type 
                    })));
                }

                console.log('\n✅ Tabela atualizada! Testando query...');
                
                // Testar query com JOIN
                db.all(`SELECT c.id, c.nome, c.regional_id, c.funcao_id, c.status,
                               r.nome as regional_nome, f.nome as funcao_nome
                        FROM colaboradores c
                        LEFT JOIN regionais r ON c.regional_id = r.id
                        LEFT JOIN funcoes f ON c.funcao_id = f.id
                        LIMIT 3`, 
                    [], 
                    (err4, rows) => {
                        if (err4) {
                            console.error('\n❌ Query ainda com erro:', err4.message);
                        } else {
                            console.log('\n✅ Query funcionando! Exemplo:');
                            console.table(rows.map(r => ({
                                nome: r.nome,
                                regional: r.regional_nome || 'Sem regional',
                                funcao: r.funcao_nome || 'Sem função'
                            })));
                        }
                        
                        console.log('\n🎉 Endpoint /api/colaboradores deve funcionar agora!');
                        db.close();
                    });
            });
        });
    });
});
