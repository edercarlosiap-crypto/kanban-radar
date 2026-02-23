const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPathEnv = process.env.DB_PATH;
const dbPathDefault = path.join(__dirname, '../../../database.db');
const dbPathAlt = path.join(__dirname, '../../database.db');
const dbPath = dbPathEnv
  ? path.resolve(dbPathEnv)
  : (fs.existsSync(dbPathDefault) ? dbPathDefault : dbPathAlt);

let db;

// Inicializar banco de dados
function inicializarBD() {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Erro ao conectar ao banco de dados:', err);
      process.exit(1);
    }
    console.log('✅ Conectado ao SQLite');
    criarTabelas();
  });
}

// Promises para BD
const db_run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const db_get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const db_all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
};

// Criar tabelas
function criarTabelas() {
  db.serialize(() => {
    // Tabela de Usuários
    db.run(`
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

    // Tabela de Regionais
    db.run(`
      CREATE TABLE IF NOT EXISTS regionais (
        id TEXT PRIMARY KEY,
        nome TEXT UNIQUE NOT NULL,
        ativo INTEGER DEFAULT 1,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Tipos de Meta
    db.run(`
      CREATE TABLE IF NOT EXISTS tipos_meta (
        id TEXT PRIMARY KEY,
        nome TEXT UNIQUE NOT NULL,
        descricao TEXT,
        meta1Volume REAL,
        meta1Percent REAL,
        meta1PercentIndividual REAL,
        meta2Volume REAL,
        meta2Percent REAL,
        meta2PercentIndividual REAL,
        meta3Volume REAL,
        meta3Percent REAL,
        meta3PercentIndividual REAL,
        incrementoGlobal REAL,
        pesoVendasChurn REAL,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Regras de Comissão
    db.run(`
      CREATE TABLE IF NOT EXISTS regras_comissao (
        id TEXT PRIMARY KEY,
        regionalId TEXT NOT NULL,
        tipoMeta TEXT NOT NULL,
        meta1Volume REAL NOT NULL,
        meta1Percent REAL NOT NULL,
        meta2Volume REAL NOT NULL,
        meta2Percent REAL NOT NULL,
        meta3Volume REAL NOT NULL,
        meta3Percent REAL NOT NULL,
        meta1PercentIndividual REAL DEFAULT 0,
        meta2PercentIndividual REAL DEFAULT 0,
        meta3PercentIndividual REAL DEFAULT 0,
        incrementoGlobal REAL DEFAULT 0,
        pesoVendasChurn REAL DEFAULT 0.5,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (regionalId) REFERENCES regionais(id)
      )
    `);

    db.all('PRAGMA table_info(regras_comissao)', (err, columns) => {
      if (err) {
        console.error('Erro ao validar colunas de regras_comissao:', err);
        return;
      }

      const colunasExistentes = new Set((columns || []).map((coluna) => coluna.name));
      const garantirColuna = (nome, tipo) => {
        if (!colunasExistentes.has(nome)) {
          db.run(`ALTER TABLE regras_comissao ADD COLUMN ${nome} ${tipo}`);
        }
      };

      garantirColuna('meta1PercentIndividual', 'REAL DEFAULT 0');
      garantirColuna('meta2PercentIndividual', 'REAL DEFAULT 0');
      garantirColuna('meta3PercentIndividual', 'REAL DEFAULT 0');
    });

    // Semear tipos_meta a partir das regras existentes, se necessario
    db.get('SELECT COUNT(*) as total FROM tipos_meta', (err, row) => {
      if (err) {
        console.error('Erro ao contar tipos_meta:', err);
        return;
      }

      if (row.total === 0) {
        db.all('SELECT DISTINCT tipoMeta as nome FROM regras_comissao', (errRules, rules) => {
          if (errRules) {
            console.error('Erro ao buscar tipos de meta nas regras:', errRules);
            return;
          }

          (rules || []).forEach((rule) => {
            db.run(
              `INSERT INTO tipos_meta (id, nome, dataCriacao, dataAtualizacao)
               VALUES (lower(hex(randomblob(16))), ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [rule.nome]
            );
          });
        });
      }
    });
    // Tabela de Colaboradores (vendedores)
    db.run(`
      CREATE TABLE IF NOT EXISTS colaboradores (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        cpf TEXT UNIQUE,
        regional_id TEXT NOT NULL,
        status TEXT DEFAULT 'ativo',
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (regional_id) REFERENCES regionais(id)
      )
    `);

    db.all('PRAGMA table_info(colaboradores)', (err, columns) => {
      if (err) {
        console.error('Erro ao validar colunas de colaboradores:', err);
        return;
      }

      const colunasExistentes = new Set((columns || []).map((coluna) => coluna.name));
      if (!colunasExistentes.has('cpf')) {
        db.run('ALTER TABLE colaboradores ADD COLUMN cpf TEXT');
      }
    });
    // Tabela de Registros de Vendas
    db.run(`
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

    // Tabela de Vendas Mensais (cadastro consolidado por periodo/vendedor)
    db.run(`
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

    // Tabela de Churn por Regional/Periodo
    db.run(`
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

    console.log('✅ Tabelas criadas/verificadas');
  });
}

module.exports = {
  inicializarBD,
  db_run,
  db_get,
  db_all
};

// Inicializar ao carregar
inicializarBD();
