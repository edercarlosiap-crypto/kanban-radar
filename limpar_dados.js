const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

console.log('🧹 Limpando dados transacionais do banco...\n');

// Limpar dados mantendo estrutura e usuários
db.serialize(() => {
    db.run('DELETE FROM vendas_mensais', [], (err) => {
        if (err) console.error('❌ Erro ao limpar vendas_mensais:', err);
        else console.log('✅ Vendas mensais limpas');
    });

    db.run('DELETE FROM churn_regionais', [], (err) => {
        if (err) console.error('❌ Erro ao limpar churn_regionais:', err);
        else console.log('✅ Churn regionais limpo');
    });

    db.run('DELETE FROM regras_comissao', [], (err) => {
        if (err) console.error('❌ Erro ao limpar regras_comissao:', err);
        else console.log('✅ Regras de comissão limpas');
    });

    // Verificar o que sobrou
    db.get('SELECT COUNT(*) as total FROM colaboradores', [], (err, row) => {
        if (!err) console.log(`\n📊 Colaboradores mantidos: ${row.total}`);
    });

    db.get('SELECT COUNT(*) as total FROM regionais', [], (err, row) => {
        if (!err) console.log(`📊 Regionais mantidas: ${row.total}`);
    });

    db.get('SELECT COUNT(*) as total FROM usuarios', [], (err, row) => {
        if (!err) {
            console.log(`📊 Usuários mantidos: ${row.total}`);
            console.log('\n✅ Banco limpo! Pronto para inserir dados via http://localhost:3003/');
            db.close();
        }
    });
});
