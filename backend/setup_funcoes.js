const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

function generateId() {
    return crypto.randomUUID();
}

console.log('🔧 Criando tabela funcoes...\n');

db.serialize(() => {
    // Criar tabela
    db.run(`
        CREATE TABLE IF NOT EXISTS funcoes (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL UNIQUE,
            eligivel_comissionamento INTEGER DEFAULT 0,
            status TEXT DEFAULT 'ativa',
            data_criacao TEXT,
            data_atualizacao TEXT
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela:', err);
            db.close();
            return;
        }
        console.log('✅ Tabela funcoes criada');

        const funcoes = [
            { nome: 'Vendedor', eligivel: 1 },
            { nome: 'Supervisor', eligivel: 1 },
            { nome: 'Gerente', eligivel: 1 },
            { nome: 'Coordenador', eligivel: 1 },
            { nome: 'Diretor', eligivel: 0 },
            { nome: 'Assistente', eligivel: 0 },
            { nome: 'Analista', eligivel: 0 }
        ];

        const now = new Date().toISOString();
        const stmt = db.prepare(`
            INSERT INTO funcoes (id, nome, eligivel_comissionamento, status, data_criacao)
            VALUES (?, ?, ?, 'ativa', ?)
        `);

        funcoes.forEach(f => {
            stmt.run(generateId(), f.nome, f.eligivel, now, (err) => {
                if (!err) {
                    console.log(`✅ ${f.nome} inserido`);
                }
            });
        });

        stmt.finalize(() => {
            console.log('\n✅ Setup concluído! Endpoint /api/funcoes agora funciona.');
            db.close();
        });
    });
});
