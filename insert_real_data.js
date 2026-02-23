const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Script de Inserção Manual de Dados Reais\n');

// ID da regional Alta Floresta Doeste
const regionalId = 'c187019b-956d-486a-b547-b9ce7a997e98';
const periodo = 'Dez/25';

// ===== CONFIGURAÇÃO DOS DADOS =====
// ALTERE AQUI COM OS VALORES REAIS:

const VENDAS = 79;  // Total de vendas
const CHURN = 51;   // Total de churn

// Se já existe um colaborador específico, coloque o ID aqui
// Senão, deixe null para criar um novo
const COLABORADOR_ID = null; // ou 'uuid-do-colaborador'
const COLABORADOR_NOME = 'Ellen'; // Nome do colaborador

// ===================================

async function limparDadosAntigos() {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM vendas_mensais WHERE periodo = ? AND regional_id = ?', 
            [periodo, regionalId], 
            (err) => {
                if (err) reject(err);
                else {
                    console.log('✅ Vendas antigas removidas');
                    db.run('DELETE FROM churn_regionais WHERE periodo = ? AND regional_id = ?',
                        [periodo, regionalId],
                        (err2) => {
                            if (err2) reject(err2);
                            else {
                                console.log('✅ Churn antigo removido');
                                resolve();
                            }
                        });
                }
            });
    });
}

async function buscarOuCriarColaborador() {
    return new Promise((resolve, reject) => {
        if (COLABORADOR_ID) {
            resolve(COLABORADOR_ID);
            return;
        }

        // Buscar colaborador por nome na regional
        db.get('SELECT id FROM colaboradores WHERE nome = ? AND regional_id = ?',
            [COLABORADOR_NOME, regionalId],
            (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    console.log(`✅ Colaborador "${COLABORADOR_NOME}" encontrado: ${row.id}`);
                    resolve(row.id);
                } else {
                    // Criar novo colaborador
                    const { v4: uuidv4 } = require('uuid');
                    const novoId = uuidv4();
                    db.run(`INSERT INTO colaboradores (id, nome, regional_id) VALUES (?, ?, ?)`,
                        [novoId, COLABORADOR_NOME, regionalId],
                        (err2) => {
                            if (err2) reject(err2);
                            else {
                                console.log(`✅ Novo colaborador "${COLABORADOR_NOME}" criado: ${novoId}`);
                                resolve(novoId);
                            }
                        });
                }
            });
    });
}

async function inserirVendas(colaboradorId) {
    return new Promise((resolve, reject) => {
        const { v4: uuidv4 } = require('uuid');
        const vendaId = uuidv4();
        const dataAtual = new Date().toISOString();

        db.run(`INSERT INTO vendas_mensais 
            (id, colaborador_id, regional_id, periodo, vendas_volume, dataCriacao, dataAtualizacao)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [vendaId, colaboradorId, regionalId, periodo, VENDAS, dataAtual, dataAtual],
            (err) => {
                if (err) reject(err);
                else {
                    console.log(`✅ ${VENDAS} vendas inseridas para ${COLABORADOR_NOME} em ${periodo}`);
                    resolve();
                }
            });
    });
}

async function inserirChurn() {
    return new Promise((resolve, reject) => {
        const dataAtual = new Date().toISOString();

        db.run(`INSERT INTO churn_regionais 
            (regional_id, periodo, churn, dataCriacao, dataAtualizacao)
            VALUES (?, ?, ?, ?, ?)`,
            [regionalId, periodo, CHURN, dataAtual, dataAtual],
            (err) => {
                if (err) reject(err);
                else {
                    console.log(`✅ ${CHURN} churn inserido para Alta Floresta em ${periodo}`);
                    resolve();
                }
            });
    });
}

async function verificarDados() {
    return new Promise((resolve) => {
        console.log('\n📊 Verificação Final:');
        db.get(`SELECT SUM(vendas_volume) as total FROM vendas_mensais 
                WHERE periodo = ? AND regional_id = ?`,
            [periodo, regionalId],
            (err, row) => {
                if (!err) console.log(`   Vendas: ${row.total}`);
                
                db.get(`SELECT churn FROM churn_regionais 
                        WHERE periodo = ? AND regional_id = ?`,
                    [periodo, regionalId],
                    (err2, row2) => {
                        if (!err2) console.log(`   Churn: ${row2?.churn || 0}`);
                        resolve();
                    });
            });
    });
}

async function main() {
    try {
        console.log(`📌 Regional: Alta Floresta Doeste`);
        console.log(`📌 Período: ${periodo}`);
        console.log(`📌 Vendas: ${VENDAS}`);
        console.log(`📌 Churn: ${CHURN}\n`);

        await limparDadosAntigos();
        const colaboradorId = await buscarOuCriarColaborador();
        await inserirVendas(colaboradorId);
        await inserirChurn();
        await verificarDados();

        console.log('\n✅ Dados inseridos com sucesso!');
        console.log('\n💡 Agora teste o endpoint:');
        console.log(`   GET /api/comissionamento/vendedores?periodo=${periodo}&regionalId=${regionalId}`);
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        db.close();
    }
}

main();
