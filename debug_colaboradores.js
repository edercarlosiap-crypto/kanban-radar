const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

console.log('🔍 Investigando problema em /api/colaboradores\n');

db.serialize(() => {
    // Verificar estrutura da tabela colaboradores
    console.log('📋 Estrutura da tabela colaboradores:');
    db.all("PRAGMA table_info(colaboradores)", [], (err, cols) => {
        if (err) {
            console.error('❌ Erro:', err);
            db.close();
            return;
        }
        console.table(cols.map(c => ({ nome: c.name, tipo: c.type, nulo: c.notnull === 0 ? 'Sim' : 'Não' })));
        
        // Ver os dados dos colaboradores
        console.log('\n📊 Colaboradores cadastrados:');
        db.all(`SELECT 
                    c.id, 
                    c.nome, 
                    c.regional_id, 
                    c.funcao_id,
                    c.status,
                    r.nome as regional_nome,
                    f.nome as funcao_nome
                FROM colaboradores c
                LEFT JOIN regionais r ON c.regional_id = r.id
                LEFT JOIN funcoes f ON c.funcao_id = f.id`, 
            [], 
            (err, rows) => {
                if (err) {
                    console.error('\n❌ ERRO ao fazer JOIN:', err.message);
                    console.log('\n💡 Problema identificado: Query com JOIN está falhando');
                    
                    // Tentar query simples
                    console.log('\n🔄 Tentando query sem JOIN...');
                    db.all('SELECT * FROM colaboradores', [], (err2, rows2) => {
                        if (!err2) {
                            console.log(`\n✅ Query simples OK - ${rows2.length} colaboradores`);
                            console.table(rows2.map(c => ({
                                nome: c.nome,
                                regional_id: c.regional_id ? c.regional_id.substring(0, 8) + '...' : 'NULL',
                                funcao_id: c.funcao_id || 'NULL'
                            })));
                        }
                        db.close();
                    });
                } else {
                    console.log(`\n✅ Total: ${rows.length}`);
                    if (rows.length > 0) {
                        console.table(rows.map(c => ({
                            nome: c.nome,
                            regional: c.regional_nome || 'NULL',
                            funcao: c.funcao_nome || 'NULL',
                            status: c.status
                        })));
                    }
                    db.close();
                }
            });
    });
});
