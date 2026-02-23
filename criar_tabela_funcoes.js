const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const db = new sqlite3.Database('database.db');

console.log('🔧 Criando tabela funcoes...\n');

db.serialize(() => {
    // Criar tabela funcoes
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
        console.log('✅ Tabela funcoes criada com sucesso');

        // Inserir funções padrão
        const funcoesPadrao = [
            { nome: 'Vendedor', eligivel: 1 },
            { nome: 'Supervisor', eligivel: 1 },
            { nome: 'Gerente', eligivel: 1 },
            { nome: 'Coordenador', eligivel: 1 },
            { nome: 'Diretor', eligivel: 0 },
            { nome: 'Assistente', eligivel: 0 },
            { nome: 'Analista', eligivel: 0 }
        ];

        console.log('\n📝 Inserindo funções padrão...\n');

        const stmt = db.prepare(`
            INSERT INTO funcoes (id, nome, eligivel_comissionamento, status, data_criacao, data_atualizacao)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const dataAtual = new Date().toISOString();

        funcoesPadrao.forEach(f => {
            const id = uuidv4();
            stmt.run(id, f.nome, f.eligivel, 'ativa', dataAtual, dataAtual, (err) => {
                if (err) {
                    console.error(`❌ Erro ao inserir "${f.nome}":`, err.message);
                } else {
                    const elegibilidade = f.eligivel === 1 ? '✓ Elegível' : '✗ Não elegível';
                    console.log(`✅ ${f.nome.padEnd(15)} - ${elegibilidade}`);
                }
            });
        });

        stmt.finalize(() => {
            // Verificar resultado
            db.all('SELECT * FROM funcoes ORDER BY nome', [], (err, rows) => {
                if (!err) {
                    console.log(`\n📊 Total de funções cadastradas: ${rows.length}\n`);
                    console.table(rows.map(r => ({
                        nome: r.nome,
                        elegivel: r.eligivel_comissionamento === 1 ? 'Sim' : 'Não',
                        status: r.status
                    })));
                }
                
                console.log('\n✅ Setup concluído! Agora você pode cadastrar colaboradores.');
                db.close();
            });
        });
    });
});
