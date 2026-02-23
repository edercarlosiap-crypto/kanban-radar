const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const dbClient = (process.env.DB_CLIENT || 'sqlite').toLowerCase();
const usePostgres = dbClient === 'postgres';

const dbPathEnv = process.env.DB_PATH;
const dbPathDefault = path.join(__dirname, '../../../database.db');
const dbPathAlt = path.join(__dirname, '../../database.db');
const dbPath = dbPathEnv
  ? path.resolve(dbPathEnv)
  : (fs.existsSync(dbPathDefault) ? dbPathDefault : dbPathAlt);

let sqliteDb;
let pgPool;

const postgresColumnAliasMap = {
  datacriacao: 'dataCriacao',
  dataatualizacao: 'dataAtualizacao',
  regionalid: 'regionalId',
  usuarioid: 'usuarioId',
  tipometa: 'tipoMeta',
  meta1volume: 'meta1Volume',
  meta1percent: 'meta1Percent',
  meta2volume: 'meta2Volume',
  meta2percent: 'meta2Percent',
  meta3volume: 'meta3Volume',
  meta3percent: 'meta3Percent',
  meta1percentindividual: 'meta1PercentIndividual',
  meta2percentindividual: 'meta2PercentIndividual',
  meta3percentindividual: 'meta3PercentIndividual',
  incrementoglobal: 'incrementoGlobal',
  pesovendaschurn: 'pesoVendasChurn'
};

function normalizeRowKeys(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[postgresColumnAliasMap[key] || key] = value;
  });
  return normalized;
}

function normalizeRows(rows = []) {
  return rows.map((row) => normalizeRowKeys(row));
}

function toPostgresPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function queryPostgres(sql, params = []) {
  const text = toPostgresPlaceholders(sql);
  return pgPool.query(text, params);
}

function initPostgresPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL nao configurada para DB_CLIENT=postgres');
  }

  const sslRequired = (process.env.PGSSL || 'require').toLowerCase() !== 'disable';
  pgPool = new Pool({
    connectionString: databaseUrl,
    ssl: sslRequired ? { rejectUnauthorized: false } : false
  });
}

async function createPostgresSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      role TEXT NOT NULL,
      regionalid TEXT,
      status TEXT DEFAULT 'ativo',
      datacriacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS regionais (
      id TEXT PRIMARY KEY,
      nome TEXT UNIQUE NOT NULL,
      ativo INTEGER DEFAULT 1,
      datacriacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS funcoes (
      id TEXT PRIMARY KEY,
      nome TEXT UNIQUE NOT NULL,
      eligivel_comissionamento INTEGER DEFAULT 1,
      status TEXT DEFAULT 'ativa',
      data_criacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS tipos_meta (
      id TEXT PRIMARY KEY,
      nome TEXT UNIQUE NOT NULL,
      descricao TEXT,
      meta1volume REAL,
      meta1percent REAL,
      meta1percentindividual REAL,
      meta2volume REAL,
      meta2percent REAL,
      meta2percentindividual REAL,
      meta3volume REAL,
      meta3percent REAL,
      meta3percentindividual REAL,
      incrementoglobal REAL,
      pesovendaschurn REAL,
      datacriacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      dataatualizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS regras_comissao (
      id TEXT PRIMARY KEY,
      regionalid TEXT NOT NULL,
      tipometa TEXT NOT NULL,
      periodo TEXT DEFAULT 'Dez/25',
      meta1volume REAL NOT NULL,
      meta1percent REAL NOT NULL,
      meta2volume REAL NOT NULL,
      meta2percent REAL NOT NULL,
      meta3volume REAL NOT NULL,
      meta3percent REAL NOT NULL,
      meta1percentindividual REAL DEFAULT 0,
      meta2percentindividual REAL DEFAULT 0,
      meta3percentindividual REAL DEFAULT 0,
      incrementoglobal REAL DEFAULT 0,
      pesovendaschurn REAL DEFAULT 0.5,
      datacriacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      dataatualizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS colaboradores (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      cpf TEXT UNIQUE,
      regional_id TEXT NOT NULL,
      funcao_id TEXT,
      status TEXT DEFAULT 'ativo',
      data_criacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS vendas (
      id TEXT PRIMARY KEY,
      usuarioid TEXT NOT NULL,
      regionalid TEXT NOT NULL,
      valor REAL NOT NULL,
      tipo TEXT NOT NULL,
      status TEXT DEFAULT 'pendente',
      datacriacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS vendas_mensais (
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
      datacriacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      dataatualizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS churn_regionais (
      id TEXT PRIMARY KEY,
      periodo TEXT NOT NULL,
      regional_id TEXT NOT NULL,
      churn REAL NOT NULL,
      datacriacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      dataatualizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (periodo, regional_id)
    )`,
    `ALTER TABLE regras_comissao ADD COLUMN IF NOT EXISTS periodo TEXT DEFAULT 'Dez/25'`,
    `ALTER TABLE regras_comissao ADD COLUMN IF NOT EXISTS meta1percentindividual REAL DEFAULT 0`,
    `ALTER TABLE regras_comissao ADD COLUMN IF NOT EXISTS meta2percentindividual REAL DEFAULT 0`,
    `ALTER TABLE regras_comissao ADD COLUMN IF NOT EXISTS meta3percentindividual REAL DEFAULT 0`,
    `ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS cpf TEXT`,
    `ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS funcao_id TEXT`
  ];

  for (const sql of statements) {
    await pgPool.query(sql);
  }

  await pgPool.query(
    `INSERT INTO tipos_meta (id, nome, datacriacao, dataatualizacao)
     SELECT md5(random()::text || clock_timestamp()::text), src.nome, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
     FROM (
       SELECT DISTINCT tipometa AS nome FROM regras_comissao WHERE tipometa IS NOT NULL
     ) src
     WHERE NOT EXISTS (SELECT 1 FROM tipos_meta tm WHERE tm.nome = src.nome)`
  );

  console.log('Conectado ao PostgreSQL');
  console.log('Tabelas criadas/verificadas');
}

function createSqliteSchema() {
  sqliteDb.serialize(() => {
    sqliteDb.run(`
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

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS regionais (
        id TEXT PRIMARY KEY,
        nome TEXT UNIQUE NOT NULL,
        ativo INTEGER DEFAULT 1,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS funcoes (
        id TEXT PRIMARY KEY,
        nome TEXT UNIQUE NOT NULL,
        eligivel_comissionamento INTEGER DEFAULT 1,
        status TEXT DEFAULT 'ativa',
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run(`
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

    sqliteDb.run(`
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

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS colaboradores (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        cpf TEXT UNIQUE,
        regional_id TEXT NOT NULL,
        funcao_id TEXT,
        status TEXT DEFAULT 'ativo',
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (regional_id) REFERENCES regionais(id),
        FOREIGN KEY (funcao_id) REFERENCES funcoes(id)
      )
    `);

    sqliteDb.run(`
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

    sqliteDb.run(`
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

    sqliteDb.run(`
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

    sqliteDb.run('ALTER TABLE colaboradores ADD COLUMN cpf TEXT', () => {});
    sqliteDb.run('ALTER TABLE colaboradores ADD COLUMN funcao_id TEXT', () => {});
    sqliteDb.run("ALTER TABLE regras_comissao ADD COLUMN periodo TEXT DEFAULT 'Dez/25'", () => {});
    sqliteDb.run('ALTER TABLE regras_comissao ADD COLUMN meta1PercentIndividual REAL DEFAULT 0', () => {});
    sqliteDb.run('ALTER TABLE regras_comissao ADD COLUMN meta2PercentIndividual REAL DEFAULT 0', () => {});
    sqliteDb.run('ALTER TABLE regras_comissao ADD COLUMN meta3PercentIndividual REAL DEFAULT 0', () => {});

    sqliteDb.get('SELECT COUNT(*) as total FROM tipos_meta', (err, row) => {
      if (err || !row || row.total !== 0) return;
      sqliteDb.all('SELECT DISTINCT tipoMeta as nome FROM regras_comissao', (errRules, rules) => {
        if (errRules) return;
        (rules || []).forEach((rule) => {
          sqliteDb.run(
            `INSERT OR IGNORE INTO tipos_meta (id, nome, dataCriacao, dataAtualizacao)
             VALUES (lower(hex(randomblob(16))), ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [rule.nome]
          );
        });
      });
    });

    console.log('Conectado ao SQLite');
    console.log('Tabelas criadas/verificadas');
  });
}

async function inicializarBD() {
  if (usePostgres) {
    initPostgresPool();
    await pgPool.query('SELECT 1');
    await createPostgresSchema();
    return;
  }

  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Erro ao conectar ao banco de dados:', err);
      process.exit(1);
    }
    createSqliteSchema();
  });
}

const db_run = async (sql, params = []) => {
  if (usePostgres) {
    const result = await queryPostgres(sql, params);
    return { id: result.rows?.[0]?.id || null, changes: result.rowCount || 0 };
  }

  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const db_get = async (sql, params = []) => {
  if (usePostgres) {
    const result = await queryPostgres(sql, params);
    return normalizeRowKeys(result.rows[0] || null);
  }

  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) return reject(err);
      return resolve(row || null);
    });
  });
};

const db_all = async (sql, params = []) => {
  if (usePostgres) {
    const result = await queryPostgres(sql, params);
    return normalizeRows(result.rows || []);
  }

  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      return resolve(rows || []);
    });
  });
};

module.exports = {
  inicializarBD,
  db_run,
  db_get,
  db_all
};

inicializarBD().catch((err) => {
  console.error('Erro ao inicializar banco de dados:', err.message);
  process.exit(1);
});
