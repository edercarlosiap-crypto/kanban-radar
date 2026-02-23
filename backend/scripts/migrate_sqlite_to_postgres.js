require('dotenv').config();
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL nao configurada. Defina a URL do PostgreSQL no .env.');
  process.exit(1);
}

const sqlitePath = path.resolve(process.env.SQLITE_MIGRATION_PATH || process.env.DB_PATH || path.resolve(__dirname, '../database.sqlite'));
const migrationMode = (process.env.MIGRATION_MODE || 'append').toLowerCase();

const sqliteDb = new sqlite3.Database(sqlitePath);
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'disable' ? false : (process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : undefined),
});

const sqliteAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });

const sqliteGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });

const hasSQLiteTable = async (table) => {
  const row = await sqliteGet(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [table]
  );
  return !!row;
};

const createPostgresTables = async () => {
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
};

const tableColumns = {
  usuarios: ['id', 'nome', 'email', 'senha', 'perfil', 'status', 'dataCriacao'],
  radar: [
    'id', 'camada', 'prioridade', 'tipo', 'acao', 'equipe', 'responsavel',
    'concluirAte', 'kanban', 'status', 'observacao', 'linkBitrix',
    'dataCriacao', 'dataAtualizacao', 'usuarioId'
  ],
  logs: ['id', 'usuario', 'acao', 'item_id', 'usuarioId', 'detalhes', 'ip', 'data'],
  configuracoes: ['id', 'logo', 'radar_camadas', 'radar_tipos', 'radar_equipes', 'radar_responsaveis', 'radar_prioridades_camada1'],
  attendants: ['id', 'name', 'active', 'created_at'],
  retention_attempts: [
    'id', 'attendant_id', 'attendant_name', 'customer_id', 'customer_name', 'branch',
    'contract_id', 'previous_calls_3_months', 'previous_call_count', 'call_origin',
    'reason_category', 'reason_subcategory', 'interaction_type', 'has_fine',
    'outcome', 'notes', 'created_at'
  ],
};

const normalizeRow = (table, row) => {
  const normalized = { ...row };

  if (table === 'usuarios') {
    if (!normalized.id || String(normalized.id).trim() === '') {
      normalized.id = normalized.email
        ? `legacy-${String(normalized.email).toLowerCase()}`
        : uuidv4();
    }
  }

  if (table === 'configuracoes') {
    if (normalized.id === null || normalized.id === undefined || normalized.id === '') {
      normalized.id = 1;
    }
  }

  return normalized;
};

const isNullish = (value) => value === null || value === undefined || value === '';

const copyTable = async (table) => {
  const exists = await hasSQLiteTable(table);
  if (!exists) {
    console.log(`- ${table}: nao existe no SQLite, ignorado`);
    return;
  }

  const rows = (await sqliteAll(`SELECT * FROM ${table}`)).map((row) => normalizeRow(table, row));
  if (!rows.length) {
    console.log(`- ${table}: sem registros`);
    return;
  }

  const allowedColumns = tableColumns[table];
  const presentColumns = Object.keys(rows[0]).filter((column) => allowedColumns.includes(column));
  let inserted = 0;
  for (const row of rows) {
    const dynamicColumns = presentColumns.filter((column) => {
      if ((table === 'radar' || table === 'logs') && column === 'id' && isNullish(row[column])) {
        return false;
      }
      return true;
    });

    const insertColumns = dynamicColumns.join(', ');
    const placeholders = dynamicColumns.map((_, idx) => `$${idx + 1}`).join(', ');
    const sql = `INSERT INTO ${table} (${insertColumns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
    const values = dynamicColumns.map((column) => row[column]);
    const result = await pgPool.query(sql, values);
    inserted += result.rowCount || 0;
  }

  console.log(`- ${table}: ${inserted}/${rows.length} inseridos`);
};

const resetTablesIfNeeded = async () => {
  if (migrationMode !== 'replace') return;

  console.log('Modo replace: limpando tabelas de destino...');
  await pgPool.query('TRUNCATE TABLE retention_attempts, attendants, logs, radar, configuracoes, usuarios RESTART IDENTITY CASCADE');
};

const syncSequences = async () => {
  await pgPool.query(`
    SELECT setval(pg_get_serial_sequence('radar', 'id'), COALESCE((SELECT MAX(id) FROM radar), 1), true)
  `);
  await pgPool.query(`
    SELECT setval(pg_get_serial_sequence('logs', 'id'), COALESCE((SELECT MAX(id) FROM logs), 1), true)
  `);
};

const run = async () => {
  try {
    console.log(`SQLite origem: ${sqlitePath}`);
    console.log(`Modo de migracao: ${migrationMode}`);

    await createPostgresTables();
    await resetTablesIfNeeded();

    const tables = ['usuarios', 'configuracoes', 'radar', 'logs', 'attendants', 'retention_attempts'];
    for (const table of tables) {
      await copyTable(table);
    }

    await syncSequences();
    console.log('Migracao concluida com sucesso.');
  } catch (error) {
    console.error('Erro na migracao:', error.message);
    process.exitCode = 1;
  } finally {
    sqliteDb.close();
    await pgPool.end();
  }
};

run();
