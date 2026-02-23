const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbClient = (process.env.DB_CLIENT || 'sqlite').toLowerCase();
const usePostgres = dbClient === 'postgres';

let sqliteDb = null;
let pgPool = null;

const dbPath = path.resolve(process.env.DB_PATH || path.resolve(__dirname, '../../database.sqlite'));

const buildPgSql = (sql) => {
  let converted = sql;

  converted = converted.replace(
    /INSERT\s+OR\s+IGNORE\s+INTO\s+([^\s(]+)\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\)/i,
    'INSERT INTO $1 ($2) VALUES ($3) ON CONFLICT DO NOTHING'
  );

  let index = 0;
  converted = converted.replace(/\?/g, () => `$${++index}`);

  return converted;
};

const PG_FIELD_MAP = {
  datacriacao: 'dataCriacao',
  dataatualizacao: 'dataAtualizacao',
  concluirate: 'concluirAte',
  linkbitrix: 'linkBitrix',
  usuarioid: 'usuarioId',
};

const normalizePgRow = (row) => {
  if (!row) return row;
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[PG_FIELD_MAP[key] || key] = value;
  });
  return normalized;
};

const initializeSqliteSchema = () => {
  sqliteDb.serialize(() => {
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        perfil TEXT DEFAULT 'leitura',
        status TEXT DEFAULT 'pendente',
        dataCriacao TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS radar (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        camada TEXT,
        prioridade TEXT,
        tipo TEXT,
        acao TEXT,
        equipe TEXT,
        responsavel TEXT,
        concluirAte TEXT,
        kanban TEXT DEFAULT 'Backlog',
        status TEXT,
        observacao TEXT,
        linkBitrix TEXT,
        dataCriacao TEXT,
        dataAtualizacao TEXT DEFAULT (datetime('now', 'localtime')),
        usuarioId TEXT,
        FOREIGN KEY (usuarioId) REFERENCES usuarios(id)
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT,
        acao TEXT,
        item_id TEXT,
        usuarioId TEXT,
        detalhes TEXT,
        ip TEXT,
        data TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        id INTEGER PRIMARY KEY DEFAULT 1,
        logo TEXT
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS attendants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS retention_attempts (
        id TEXT PRIMARY KEY,
        attendant_id TEXT NOT NULL,
        attendant_name TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        branch TEXT NOT NULL,
        contract_id TEXT,
        previous_calls_3_months INTEGER DEFAULT 0,
        previous_call_count INTEGER DEFAULT 0,
        call_origin TEXT NOT NULL,
        reason_category TEXT NOT NULL,
        reason_subcategory TEXT,
        interaction_type TEXT NOT NULL,
        has_fine INTEGER DEFAULT 0,
        outcome TEXT NOT NULL,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `);

    const ensureColumn = (table, column, definition) => {
      sqliteDb.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (err) {
          console.error(`Erro ao verificar colunas de ${table}:`, err.message);
          return;
        }
        const exists = (rows || []).some((row) => row.name === column);
        if (!exists) {
          sqliteDb.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        }
      });
    };

    ensureColumn('configuracoes', 'radar_camadas', 'TEXT');
    ensureColumn('configuracoes', 'radar_tipos', 'TEXT');
    ensureColumn('configuracoes', 'radar_equipes', 'TEXT');
    ensureColumn('configuracoes', 'radar_responsaveis', 'TEXT');
    ensureColumn('configuracoes', 'radar_prioridades_camada1', 'TEXT');
    ensureColumn('logs', 'usuario', 'TEXT');
    ensureColumn('logs', 'item_id', 'TEXT');

    console.log('SQLite: tabelas verificadas/criadas com sucesso');
  });
};

const initializePostgresSchema = async () => {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      perfil TEXT DEFAULT 'leitura',
      status TEXT DEFAULT 'pendente',
      dataCriacao TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS radar (
      id BIGSERIAL PRIMARY KEY,
      camada TEXT,
      prioridade TEXT,
      tipo TEXT,
      acao TEXT,
      equipe TEXT,
      responsavel TEXT,
      concluirAte TEXT,
      kanban TEXT DEFAULT 'Backlog',
      status TEXT,
      observacao TEXT,
      linkBitrix TEXT,
      dataCriacao TEXT,
      dataAtualizacao TIMESTAMPTZ DEFAULT NOW(),
      usuarioId TEXT REFERENCES usuarios(id)
    )
  `);

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id BIGSERIAL PRIMARY KEY,
      usuario TEXT,
      acao TEXT,
      item_id TEXT,
      usuarioId TEXT,
      detalhes TEXT,
      ip TEXT,
      data TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY,
      logo TEXT,
      radar_camadas TEXT,
      radar_tipos TEXT,
      radar_equipes TEXT,
      radar_responsaveis TEXT,
      radar_prioridades_camada1 TEXT
    )
  `);

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS attendants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS retention_attempts (
      id TEXT PRIMARY KEY,
      attendant_id TEXT NOT NULL,
      attendant_name TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      branch TEXT NOT NULL,
      contract_id TEXT,
      previous_calls_3_months INTEGER DEFAULT 0,
      previous_call_count INTEGER DEFAULT 0,
      call_origin TEXT NOT NULL,
      reason_category TEXT NOT NULL,
      reason_subcategory TEXT,
      interaction_type TEXT NOT NULL,
      has_fine INTEGER DEFAULT 0,
      outcome TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pgPool.query('CREATE INDEX IF NOT EXISTS idx_radar_usuario ON radar(usuarioId)');
  await pgPool.query('CREATE INDEX IF NOT EXISTS idx_retention_created ON retention_attempts(created_at)');
  await pgPool.query('CREATE INDEX IF NOT EXISTS idx_retention_branch ON retention_attempts(branch)');

  console.log('PostgreSQL: tabelas verificadas/criadas com sucesso');
};

if (usePostgres) {
  const { Pool } = require('pg');

  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'disable' ? false : (process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : undefined),
  });

  pgPool.connect()
    .then(async (client) => {
      client.release();
      await initializePostgresSchema();
      console.log('PostgreSQL: conexão estabelecida');
    })
    .catch((err) => {
      console.error('Erro ao conectar no PostgreSQL:', err.message);
      process.exit(1);
    });
} else {
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Erro ao conectar no SQLite:', err.message);
      process.exit(1);
    }
    console.log('SQLite: banco conectado em', dbPath);
    initializeSqliteSchema();
  });
}

function db_all(sql, params = []) {
  if (usePostgres) {
    return pgPool.query(buildPgSql(sql), params).then((result) => (result.rows || []).map(normalizePgRow));
  }

  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function db_get(sql, params = []) {
  if (usePostgres) {
    return pgPool.query(buildPgSql(sql), params).then((result) => normalizePgRow((result.rows || [])[0] || null));
  }

  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function db_run(sql, params = []) {
  if (usePostgres) {
    const converted = buildPgSql(sql);
    const isInsert = /^\s*INSERT\s+/i.test(converted);
    const finalSql = isInsert && !/\sRETURNING\s+/i.test(converted)
      ? `${converted} RETURNING id`
      : converted;

    return pgPool.query(finalSql, params).then((result) => ({
      id: result.rows?.[0]?.id ?? null,
      changes: result.rowCount ?? 0,
    }));
  }

  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

module.exports = {
  db: sqliteDb || pgPool,
  db_all,
  db_get,
  db_run,
};
