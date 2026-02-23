#!/usr/bin/env node
/**
 * Script para criar tabelas e popular com dados
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');

// Promisify database operations
function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function allAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function main() {
  const db = new sqlite3.Database(dbPath);

  try {
    console.log('✅ Conectado ao banco\n');

    // Create tables
    console.log('📋 Criando tabelas...');
    
    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        role TEXT NOT NULL,
        regionalId TEXT,
        status TEXT DEFAULT 'ativo',
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ Tabela usuarios criada');

    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS regionais (
        id TEXT PRIMARY KEY,
        nome TEXT UNIQUE NOT NULL,
        ativo INTEGER DEFAULT 1,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ Tabela regionais criada');

    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS funcoes (
        id TEXT PRIMARY KEY,
        nome TEXT UNIQUE NOT NULL,
        eligivel_comissionamento INTEGER DEFAULT 1,
        status TEXT DEFAULT 'ativa',
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ Tabela funcoes criada');

    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS colaboradores (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        regional_id TEXT NOT NULL,
        funcao_id TEXT NOT NULL,
        status TEXT DEFAULT 'ativo',
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (regional_id) REFERENCES regionais(id),
        FOREIGN KEY (funcao_id) REFERENCES funcoes(id)
      )
    `);
    console.log('  ✓ Tabela colaboradores criada');

    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS regras_comissao (
        id TEXT PRIMARY KEY,
        regionalId TEXT NOT NULL,
        tipoMeta TEXT NOT NULL,
        periodo TEXT DEFAULT 'Dez/25',
        meta1Volume REAL NOT NULL,
        meta1Percent REAL NOT NULL,
        meta2Volume REAL NOT NULL,
        meta2Percent REAL NOT NULL,
        meta3Volume REAL NOT NULL,
        meta3Percent REAL NOT NULL,
        incrementoGlobal REAL DEFAULT 0,
        pesoVendasChurn REAL DEFAULT 0.5,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (regionalId) REFERENCES regionais(id)
      )
    `);
    console.log('  ✓ Tabela regras_comissao criada');

    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS vendas (
        id TEXT PRIMARY KEY,
        usuarioId TEXT NOT NULL,
        regionalId TEXT NOT NULL,
        valor REAL NOT NULL,
        tipo TEXT NOT NULL,
        status TEXT DEFAULT 'pendente',
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuarioId) REFERENCES usuarios(id),
        FOREIGN KEY (regionalId) REFERENCES regionais(id)
      )
    `);
    console.log('  ✓ Tabela vendas criada');

    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS vendas_mensais (
        id TEXT PRIMARY KEY,
        periodo TEXT NOT NULL,
        vendedor_id TEXT NOT NULL,
        regional_id TEXT NOT NULL,
        vendas_volume REAL DEFAULT 0,
        vendas_financeiro REAL DEFAULT 0,
        mudanca_titularidade_volume REAL DEFAULT 0,
        mudanca_titularidade_financeiro REAL DEFAULT 0,
        migracao_tecnologia_volume REAL DEFAULT 0,
        migracao_tecnologia_financeiro REAL DEFAULT 0,
        renovacao_volume REAL DEFAULT 0,
        renovacao_financeiro REAL DEFAULT 0,
        plano_evento_volume REAL DEFAULT 0,
        plano_evento_financeiro REAL DEFAULT 0,
        sva_volume REAL DEFAULT 0,
        sva_financeiro REAL DEFAULT 0,
        telefonia_volume REAL DEFAULT 0,
        telefonia_financeiro REAL DEFAULT 0,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendedor_id) REFERENCES colaboradores(id),
        FOREIGN KEY (regional_id) REFERENCES regionais(id)
      )
    `);
    console.log('  ✓ Tabela vendas_mensais criada');

    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS churn_regionais (
        id TEXT PRIMARY KEY,
        periodo TEXT NOT NULL,
        regional_id TEXT NOT NULL,
        churn REAL NOT NULL,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (periodo, regional_id),
        FOREIGN KEY (regional_id) REFERENCES regionais(id)
      )
    `);
    console.log('  ✓ Tabela churn_regionais criada');

    // Populate data
    console.log('\n📝 Populando com dados de teste...');

    // Hash password
    const hash = await bcrypt.hash('123456', 10);

    // Insert usuarios
    console.log('\n👥 Usuários:');
    const usuarios = [
      { id: uuidv4(), nome: 'Administrador', email: 'admin@example.com', role: 'admin' },
      { id: uuidv4(), nome: 'Editor Demo', email: 'editor@example.com', role: 'editor' },
      { id: uuidv4(), nome: 'Gestor Demo', email: 'gestor@example.com', role: 'gestor' },
      { id: uuidv4(), nome: 'Leitor Demo', email: 'leitura@example.com', role: 'leitura' }
    ];

    const usuariosIds = [];
    for (const u of usuarios) {
      try {
        await runAsync(
          db,
          `INSERT INTO usuarios (id, nome, email, senha, role, status) VALUES (?, ?, ?, ?, ?, ?)`,
          [u.id, u.nome, u.email, hash, u.role, 'ativo']
        );
        usuariosIds.push(u.id);
        console.log(`  ✓ ${u.email}`);
      } catch (err) {
        console.error(`  ❌ ${u.email}:`, err.message);
      }
    }

    // Insert regionais
    console.log('\n🗺️  Regionais:');
    const regionais = [
      'São Paulo',
      'Rio de Janeiro',
      'Minas Gerais',
      'Bahia',
      'Santa Catarina'
    ];

    const regionaisIds = [];
    for (const nome of regionais) {
      try {
        const id = uuidv4();
        await runAsync(
          db,
          `INSERT INTO regionais (id, nome, ativo) VALUES (?, ?, 1)`,
          [id, nome]
        );
        regionaisIds.push(id);
        console.log(`  ✓ ${nome}`);
      } catch (err) {
        console.error(`  ❌ ${nome}:`, err.message);
      }
    }

    // Insert funções
    console.log('\n💼 Funções:');
    const funcoes = [
      { nome: 'Gerente de Vendas', eligivel: true },
      { nome: 'Vendedor', eligivel: true },
      { nome: 'Account Executive', eligivel: true },
      { nome: 'Analista', eligivel: false },
      { nome: 'Supervisor', eligivel: true }
    ];

    const fucoesIds = [];
    for (const func of funcoes) {
      try {
        const id = uuidv4();
        await runAsync(
          db,
          `INSERT INTO funcoes (id, nome, eligivel_comissionamento, status) VALUES (?, ?, ?, ?)`,
          [id, func.nome, func.eligivel ? 1 : 0, 'ativa']
        );
        fucoesIds.push({ id, nome: func.nome });
        console.log(`  ✓ ${func.nome}${func.eligivel ? ' (elegível)' : ''}`);
      } catch (err) {
        console.error(`  ❌ ${func.nome}:`, err.message);
      }
    }

    // Insert colaboradores
    console.log('\n👨‍💼 Colaboradores:');
    const colaboradores = [
      { nome: 'João Silva', regional_idx: 0, funcao_idx: 0 },
      { nome: 'Maria Santos', regional_idx: 0, funcao_idx: 1 },
      { nome: 'Pedro Costa', regional_idx: 1, funcao_idx: 1 },
      { nome: 'Ana Paula', regional_idx: 1, funcao_idx: 2 },
      { nome: 'Carlos Mendes', regional_idx: 2, funcao_idx: 0 },
      { nome: 'Fernanda Lima', regional_idx: 2, funcao_idx: 1 }
    ];

    for (const colab of colaboradores) {
      try {
        if (regionaisIds[colab.regional_idx] && fucoesIds[colab.funcao_idx]) {
          await runAsync(
            db,
            `INSERT INTO colaboradores (id, nome, regional_id, funcao_id, status) VALUES (?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              colab.nome,
              regionaisIds[colab.regional_idx],
              fucoesIds[colab.funcao_idx].id,
              'ativo'
            ]
          );
          console.log(`  ✓ ${colab.nome}`);
        }
      } catch (err) {
        console.error(`  ❌ ${colab.nome}:`, err.message);
      }
    }

    // Insert regras_comissao
    console.log('\n📊 Regras de Comissão:');
    for (const regionalId of regionaisIds) {
      try {
        await runAsync(
          db,
          `INSERT INTO regras_comissao 
            (id, regionalId, tipoMeta, meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, incrementoGlobal, pesoVendasChurn)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            regionalId,
            'Vendas',
            10000, 2,
            15000, 3,
            20000, 4,
            5, 0.7
          ]
        );
      } catch (err) {
        console.error(`  ❌ Erro ao criar regra:`, err.message);
      }
    }
    console.log(`  ✓ 5 Regras criadas`);

    // Verify users were inserted
    const users = await allAsync(db, 'SELECT COUNT(*) as count FROM usuarios');
    console.log(`\n✅ Total de usuários criados: ${users[0].count}`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ SEED COMPLETO!');
    console.log('='.repeat(50));
    console.log('\n🔑 Faça login com:');
    console.log('  Email: admin@example.com');
    console.log('  Senha: 123456');
    console.log('\nOu teste outros usuários:');
    console.log('  • editor@example.com (Função: editor)');
    console.log('  • gestor@example.com (Função: gestor)');
    console.log('  • leitura@example.com (Função: leitura)');
    console.log('\n');

    db.close();
    process.exit(0);

  } catch (erro) {
    console.error('\n❌ Erro:', erro.message);
    db.close();
    process.exit(1);
  }
}

main();
