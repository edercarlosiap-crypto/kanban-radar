const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const dbClient = (process.env.DB_CLIENT || 'sqlite').toLowerCase();
const usePostgres = dbClient === 'postgres';

const backendRoot = path.resolve(__dirname, '../..');
const projectRoot = path.resolve(backendRoot, '..');
const dbPathEnv = process.env.DB_PATH;
const dbPathDefault = path.join(backendRoot, 'database.db');
const dbPathLegacy = path.join(projectRoot, 'database.db');
const dbPath = dbPathEnv
  ? (path.isAbsolute(dbPathEnv) ? dbPathEnv : path.resolve(backendRoot, dbPathEnv))
  : dbPathDefault;

if (!dbPathEnv && fs.existsSync(dbPathLegacy) && dbPathLegacy !== dbPathDefault) {
  if (fs.existsSync(dbPathDefault)) {
    const defaultSize = fs.statSync(dbPathDefault).size;
    const legacySize = fs.statSync(dbPathLegacy).size;
    if (legacySize > 0 && legacySize !== defaultSize) {
      console.warn(
        `[DB] Banco legado detectado em "${dbPathLegacy}" com tamanho diferente do oficial "${dbPathDefault}".`
      );
    }
  } else {
    console.warn(
      `[DB] Banco oficial nao encontrado em "${dbPathDefault}", mas banco legado existe em "${dbPathLegacy}".`
    );
  }
}

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
    `CREATE TABLE IF NOT EXISTS regional_cidades (
      id TEXT PRIMARY KEY,
      cidade TEXT UNIQUE NOT NULL,
      regional_id TEXT,
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
      data_ativacao TIMESTAMPTZ,
      data_inativacao TIMESTAMPTZ,
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
      base_ref REAL DEFAULT 0,
      cancelados_churn REAL DEFAULT 0,
      datacriacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      dataatualizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (periodo, regional_id)
    )`,
    `CREATE TABLE IF NOT EXISTS retencao_atendimentos (
      id TEXT PRIMARY KEY,
      tipo_registro TEXT NOT NULL,
      data_atendimento DATE NOT NULL,
      periodo TEXT NOT NULL,
      atendente TEXT NOT NULL,
      cliente_id TEXT,
      nome_completo TEXT NOT NULL,
      filial TEXT NOT NULL,
      contrato_id TEXT,
      houve_chamado_anterior INTEGER DEFAULT 0,
      qtd_chamados INTEGER DEFAULT 0,
      origem_chamada TEXT,
      motivo TEXT,
      submotivo TEXT,
      cliente_aceitou_acordo INTEGER DEFAULT 0,
      tipo_atendimento TEXT,
      possui_multa_contratual INTEGER DEFAULT 0,
      possui_proporcional_mensalidade INTEGER DEFAULT 0,
      equipamentos TEXT,
      resultado_tratativa TEXT,
      historico TEXT,
      origem_arquivo TEXT,
      assinatura TEXT UNIQUE,
      datacriacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      dataatualizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS contratos_base (
      id TEXT PRIMARY KEY,
      periodo_referencia TEXT NOT NULL,
      empresa TEXT,
      filial TEXT,
      contrato_id TEXT,
      cliente_id TEXT,
      tipo_assinante TEXT,
      tipo_cliente TEXT,
      origem TEXT,
      status TEXT,
      status_acesso TEXT,
      base TEXT,
      descricao_servico TEXT,
      tipo_produto TEXT,
      tipo_contrato TEXT,
      tipo_cobranca TEXT,
      carteira_cobranca TEXT,
      vendedor TEXT,
      valor REAL DEFAULT 0,
      cidade TEXT,
      uf TEXT,
      dt_criacao_contrato DATE,
      dt_ativacao DATE,
      dt_cancelamento DATE,
      chave_negocio TEXT UNIQUE,
      origem_arquivo TEXT,
      datacriacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      dataatualizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS marketing_lancamentos (
      id TEXT PRIMARY KEY,
      ano_referencia INTEGER NOT NULL,
      mes_referencia INTEGER,
      regional TEXT,
      tipo_lancamento TEXT,
      tipo_custo TEXT,
      patrocinador TEXT,
      projeto TEXT,
      valor REAL DEFAULT 0,
      data_inicio DATE,
      data_fim DATE,
      status TEXT,
      observacoes TEXT,
      origem_arquivo TEXT,
      datacriacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      dataatualizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS marketing_orcamentos (
      id TEXT PRIMARY KEY,
      ano_referencia INTEGER NOT NULL,
      mes_referencia INTEGER NOT NULL,
      categoria TEXT NOT NULL,
      valor_orcado REAL DEFAULT 0,
      origem_arquivo TEXT,
      datacriacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      dataatualizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS comissao_lideranca_regras (
      id TEXT PRIMARY KEY,
      periodo TEXT UNIQUE NOT NULL,
      gerenteRegionalMultiplier REAL DEFAULT 1.2,
      supervisorRegionalMultiplier REAL DEFAULT 1.0,
      gerenteMatrizMultiplier REAL DEFAULT 2.4,
      datacriacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      dataatualizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `ALTER TABLE regras_comissao ADD COLUMN IF NOT EXISTS periodo TEXT DEFAULT 'Dez/25'`,
    `ALTER TABLE regras_comissao ADD COLUMN IF NOT EXISTS meta1percentindividual REAL DEFAULT 0`,
    `ALTER TABLE regras_comissao ADD COLUMN IF NOT EXISTS meta2percentindividual REAL DEFAULT 0`,
    `ALTER TABLE regras_comissao ADD COLUMN IF NOT EXISTS meta3percentindividual REAL DEFAULT 0`,
    `ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS cpf TEXT`,
    `ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS funcao_id TEXT`,
    `ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS data_ativacao TIMESTAMPTZ`,
    `ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS data_inativacao TIMESTAMPTZ`,
    `UPDATE colaboradores
        SET data_ativacao = COALESCE(data_ativacao, data_criacao, CURRENT_TIMESTAMP)
      WHERE LOWER(COALESCE(status, '')) = 'ativo'
        AND data_ativacao IS NULL`,
    `ALTER TABLE churn_regionais ADD COLUMN IF NOT EXISTS base_ref REAL DEFAULT 0`,
    `ALTER TABLE churn_regionais ADD COLUMN IF NOT EXISTS cancelados_churn REAL DEFAULT 0`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS tipo_registro TEXT`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS data_atendimento DATE`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS periodo TEXT`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS atendente TEXT`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS cliente_id TEXT`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS nome_completo TEXT`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS filial TEXT`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS contrato_id TEXT`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS houve_chamado_anterior INTEGER DEFAULT 0`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS qtd_chamados INTEGER DEFAULT 0`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS origem_chamada TEXT`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS motivo TEXT`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS submotivo TEXT`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS cliente_aceitou_acordo INTEGER DEFAULT 0`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS tipo_atendimento TEXT`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS possui_multa_contratual INTEGER DEFAULT 0`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS possui_proporcional_mensalidade INTEGER DEFAULT 0`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS equipamentos TEXT`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS resultado_tratativa TEXT`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS historico TEXT`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS origem_arquivo TEXT`,
    `ALTER TABLE retencao_atendimentos ADD COLUMN IF NOT EXISTS assinatura TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)`,
    `CREATE INDEX IF NOT EXISTS idx_colaboradores_regional ON colaboradores(regional_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_colaboradores_nome_regional_ci ON colaboradores(regional_id, LOWER(TRIM(nome)))`,
    `CREATE INDEX IF NOT EXISTS idx_regional_cidades_cidade ON regional_cidades(cidade)`,
    `CREATE INDEX IF NOT EXISTS idx_regional_cidades_regional ON regional_cidades(regional_id)`,
    `CREATE INDEX IF NOT EXISTS idx_colaboradores_funcao ON colaboradores(funcao_id)`,
    `CREATE INDEX IF NOT EXISTS idx_regras_regional_periodo ON regras_comissao(regionalid, periodo)`,
    `CREATE INDEX IF NOT EXISTS idx_regras_tipometa ON regras_comissao(tipometa)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_regras_periodo_regional_tipometa_ci ON regras_comissao(periodo, regionalid, LOWER(TRIM(tipometa)))`,
    `CREATE INDEX IF NOT EXISTS idx_vendas_mensais_periodo ON vendas_mensais(periodo)`,
    `CREATE INDEX IF NOT EXISTS idx_vendas_mensais_regional ON vendas_mensais(regional_id)`,
    `CREATE INDEX IF NOT EXISTS idx_vendas_mensais_vendedor ON vendas_mensais(vendedor_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_vendas_mensais_periodo_vendedor_regional ON vendas_mensais(periodo, vendedor_id, regional_id)`,
    `CREATE INDEX IF NOT EXISTS idx_vendas_mensais_vendedor_regional_periodo ON vendas_mensais(vendedor_id, regional_id, periodo)`,
    `CREATE INDEX IF NOT EXISTS idx_churn_periodo_regional ON churn_regionais(periodo, regional_id)`,
    `CREATE INDEX IF NOT EXISTS idx_lideranca_periodo ON comissao_lideranca_regras(periodo)`,
    `CREATE INDEX IF NOT EXISTS idx_retencao_periodo ON retencao_atendimentos(periodo)`,
    `CREATE INDEX IF NOT EXISTS idx_retencao_tipo ON retencao_atendimentos(tipo_registro)`,
    `CREATE INDEX IF NOT EXISTS idx_retencao_filial ON retencao_atendimentos(filial)`,
    `CREATE INDEX IF NOT EXISTS idx_retencao_assinatura ON retencao_atendimentos(assinatura)`,
    `CREATE INDEX IF NOT EXISTS idx_retencao_tipo_periodo_data ON retencao_atendimentos(tipo_registro, periodo, data_atendimento DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_retencao_periodo_data ON retencao_atendimentos(periodo, data_atendimento DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_retencao_tipo_periodo_filial_data_criacao ON retencao_atendimentos(tipo_registro, periodo, filial, data_atendimento DESC, dataCriacao DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_contratos_periodo ON contratos_base(periodo_referencia)`,
    `CREATE INDEX IF NOT EXISTS idx_contratos_filial ON contratos_base(filial)`,
    `CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos_base(status)`,
    `CREATE INDEX IF NOT EXISTS idx_contratos_base ON contratos_base(base)`,
    `CREATE INDEX IF NOT EXISTS idx_contratos_segmento ON contratos_base(tipo_assinante)`,
    `CREATE INDEX IF NOT EXISTS idx_contratos_periodo_segmento ON contratos_base(periodo_referencia, tipo_assinante)`,
    `CREATE INDEX IF NOT EXISTS idx_contratos_chave_negocio ON contratos_base(chave_negocio)`,
    `CREATE INDEX IF NOT EXISTS idx_vendas_mensais_periodo_regional_data ON vendas_mensais(periodo, regional_id, dataCriacao DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_vendas_mensais_periodo_vendedor_data ON vendas_mensais(periodo, vendedor_id, dataCriacao DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_marketing_lancamentos_ano ON marketing_lancamentos(ano_referencia)`,
    `CREATE INDEX IF NOT EXISTS idx_marketing_lancamentos_ano_mes ON marketing_lancamentos(ano_referencia, mes_referencia)`,
    `CREATE INDEX IF NOT EXISTS idx_marketing_lancamentos_regional ON marketing_lancamentos(regional)`,
    `CREATE INDEX IF NOT EXISTS idx_marketing_lancamentos_tipo_custo ON marketing_lancamentos(tipo_custo)`,
    `CREATE INDEX IF NOT EXISTS idx_marketing_lancamentos_tipo_status ON marketing_lancamentos(tipo_lancamento, status)`,
    `CREATE INDEX IF NOT EXISTS idx_marketing_orcamentos_ano ON marketing_orcamentos(ano_referencia)`,
    `CREATE INDEX IF NOT EXISTS idx_marketing_orcamentos_ano_mes ON marketing_orcamentos(ano_referencia, mes_referencia)`,
    `CREATE INDEX IF NOT EXISTS idx_marketing_orcamentos_categoria ON marketing_orcamentos(categoria)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_orcamentos_ano_mes_categoria ON marketing_orcamentos(ano_referencia, mes_referencia, LOWER(TRIM(categoria)))`
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
    sqliteDb.run('PRAGMA journal_mode=WAL');
    sqliteDb.run('PRAGMA synchronous=NORMAL');
    sqliteDb.run('PRAGMA foreign_keys=ON');
    sqliteDb.run('PRAGMA busy_timeout=10000');
    sqliteDb.run('PRAGMA temp_store=MEMORY');

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
      CREATE TABLE IF NOT EXISTS regional_cidades (
        id TEXT PRIMARY KEY,
        cidade TEXT UNIQUE NOT NULL,
        regional_id TEXT,
        ativo INTEGER DEFAULT 1,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (regional_id) REFERENCES regionais(id)
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
        data_ativacao DATETIME,
        data_inativacao DATETIME,
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
        base_ref REAL DEFAULT 0,
        cancelados_churn REAL DEFAULT 0,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (periodo, regional_id),
        FOREIGN KEY (regional_id) REFERENCES regionais(id)
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS retencao_atendimentos (
        id TEXT PRIMARY KEY,
        tipo_registro TEXT NOT NULL,
        data_atendimento DATE NOT NULL,
        periodo TEXT NOT NULL,
        atendente TEXT NOT NULL,
        cliente_id TEXT,
        nome_completo TEXT NOT NULL,
        filial TEXT NOT NULL,
        contrato_id TEXT,
        houve_chamado_anterior INTEGER DEFAULT 0,
        qtd_chamados INTEGER DEFAULT 0,
        origem_chamada TEXT,
        motivo TEXT,
        submotivo TEXT,
        cliente_aceitou_acordo INTEGER DEFAULT 0,
        tipo_atendimento TEXT,
        possui_multa_contratual INTEGER DEFAULT 0,
        possui_proporcional_mensalidade INTEGER DEFAULT 0,
        equipamentos TEXT,
        resultado_tratativa TEXT,
        historico TEXT,
        origem_arquivo TEXT,
        assinatura TEXT UNIQUE,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS contratos_base (
        id TEXT PRIMARY KEY,
        periodo_referencia TEXT NOT NULL,
        empresa TEXT,
        filial TEXT,
        contrato_id TEXT,
        cliente_id TEXT,
        tipo_assinante TEXT,
        tipo_cliente TEXT,
        origem TEXT,
        status TEXT,
        status_acesso TEXT,
        base TEXT,
        descricao_servico TEXT,
        tipo_produto TEXT,
        tipo_contrato TEXT,
        tipo_cobranca TEXT,
        carteira_cobranca TEXT,
        vendedor TEXT,
        valor REAL DEFAULT 0,
        cidade TEXT,
        uf TEXT,
        dt_criacao_contrato DATE,
        dt_ativacao DATE,
        dt_cancelamento DATE,
        chave_negocio TEXT UNIQUE,
        origem_arquivo TEXT,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS marketing_lancamentos (
        id TEXT PRIMARY KEY,
        ano_referencia INTEGER NOT NULL,
        mes_referencia INTEGER,
        regional TEXT,
        tipo_lancamento TEXT,
        tipo_custo TEXT,
        patrocinador TEXT,
        projeto TEXT,
        valor REAL DEFAULT 0,
        data_inicio DATE,
        data_fim DATE,
        status TEXT,
        observacoes TEXT,
        origem_arquivo TEXT,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS marketing_orcamentos (
        id TEXT PRIMARY KEY,
        ano_referencia INTEGER NOT NULL,
        mes_referencia INTEGER NOT NULL,
        categoria TEXT NOT NULL,
        valor_orcado REAL DEFAULT 0,
        origem_arquivo TEXT,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS comissao_lideranca_regras (
        id TEXT PRIMARY KEY,
        periodo TEXT UNIQUE NOT NULL,
        gerenteRegionalMultiplier REAL DEFAULT 1.2,
        supervisorRegionalMultiplier REAL DEFAULT 1.0,
        gerenteMatrizMultiplier REAL DEFAULT 2.4,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run('ALTER TABLE colaboradores ADD COLUMN cpf TEXT', () => {});
    sqliteDb.run('ALTER TABLE colaboradores ADD COLUMN funcao_id TEXT', () => {});
    sqliteDb.run('ALTER TABLE colaboradores ADD COLUMN data_ativacao DATETIME', () => {});
    sqliteDb.run('ALTER TABLE colaboradores ADD COLUMN data_inativacao DATETIME', () => {});
    sqliteDb.run(`UPDATE colaboradores
      SET data_ativacao = COALESCE(data_ativacao, data_criacao, CURRENT_TIMESTAMP)
      WHERE LOWER(COALESCE(status, '')) = 'ativo'
        AND data_ativacao IS NULL`);
    sqliteDb.run('ALTER TABLE churn_regionais ADD COLUMN base_ref REAL DEFAULT 0', () => {});
    sqliteDb.run('ALTER TABLE churn_regionais ADD COLUMN cancelados_churn REAL DEFAULT 0', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN tipo_registro TEXT', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN data_atendimento DATE', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN periodo TEXT', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN atendente TEXT', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN cliente_id TEXT', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN nome_completo TEXT', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN filial TEXT', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN contrato_id TEXT', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN houve_chamado_anterior INTEGER DEFAULT 0', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN qtd_chamados INTEGER DEFAULT 0', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN origem_chamada TEXT', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN motivo TEXT', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN submotivo TEXT', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN cliente_aceitou_acordo INTEGER DEFAULT 0', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN tipo_atendimento TEXT', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN possui_multa_contratual INTEGER DEFAULT 0', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN possui_proporcional_mensalidade INTEGER DEFAULT 0', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN equipamentos TEXT', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN resultado_tratativa TEXT', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN historico TEXT', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN origem_arquivo TEXT', () => {});
    sqliteDb.run('ALTER TABLE retencao_atendimentos ADD COLUMN assinatura TEXT', () => {});
    sqliteDb.run("ALTER TABLE regras_comissao ADD COLUMN periodo TEXT DEFAULT 'Dez/25'", () => {});
    sqliteDb.run('ALTER TABLE regras_comissao ADD COLUMN meta1PercentIndividual REAL DEFAULT 0', () => {});
    sqliteDb.run('ALTER TABLE regras_comissao ADD COLUMN meta2PercentIndividual REAL DEFAULT 0', () => {});
    sqliteDb.run('ALTER TABLE regras_comissao ADD COLUMN meta3PercentIndividual REAL DEFAULT 0', () => {});
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_colaboradores_regional ON colaboradores(regional_id)');
    sqliteDb.run('CREATE UNIQUE INDEX IF NOT EXISTS uq_colaboradores_nome_regional_ci ON colaboradores(regional_id, LOWER(TRIM(nome)))');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_regional_cidades_cidade ON regional_cidades(cidade)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_regional_cidades_regional ON regional_cidades(regional_id)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_colaboradores_funcao ON colaboradores(funcao_id)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_regras_regional_periodo ON regras_comissao(regionalId, periodo)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_regras_tipometa ON regras_comissao(tipoMeta)');
    sqliteDb.run('CREATE UNIQUE INDEX IF NOT EXISTS uq_regras_periodo_regional_tipometa_ci ON regras_comissao(periodo, regionalId, LOWER(TRIM(tipoMeta)))');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_vendas_mensais_periodo ON vendas_mensais(periodo)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_vendas_mensais_regional ON vendas_mensais(regional_id)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_vendas_mensais_vendedor ON vendas_mensais(vendedor_id)');
    sqliteDb.run('CREATE UNIQUE INDEX IF NOT EXISTS uq_vendas_mensais_periodo_vendedor_regional ON vendas_mensais(periodo, vendedor_id, regional_id)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_vendas_mensais_vendedor_regional_periodo ON vendas_mensais(vendedor_id, regional_id, periodo)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_churn_periodo_regional ON churn_regionais(periodo, regional_id)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_lideranca_periodo ON comissao_lideranca_regras(periodo)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_retencao_periodo ON retencao_atendimentos(periodo)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_retencao_tipo ON retencao_atendimentos(tipo_registro)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_retencao_filial ON retencao_atendimentos(filial)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_retencao_assinatura ON retencao_atendimentos(assinatura)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_retencao_tipo_periodo_data ON retencao_atendimentos(tipo_registro, periodo, data_atendimento DESC)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_retencao_periodo_data ON retencao_atendimentos(periodo, data_atendimento DESC)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_retencao_tipo_periodo_filial_data_criacao ON retencao_atendimentos(tipo_registro, periodo, filial, data_atendimento DESC, dataCriacao DESC)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_contratos_periodo ON contratos_base(periodo_referencia)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_contratos_filial ON contratos_base(filial)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos_base(status)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_contratos_base ON contratos_base(base)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_contratos_segmento ON contratos_base(tipo_assinante)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_contratos_periodo_segmento ON contratos_base(periodo_referencia, tipo_assinante)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_contratos_chave_negocio ON contratos_base(chave_negocio)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_vendas_mensais_periodo_regional_data ON vendas_mensais(periodo, regional_id, dataCriacao DESC)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_vendas_mensais_periodo_vendedor_data ON vendas_mensais(periodo, vendedor_id, dataCriacao DESC)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_marketing_lancamentos_ano ON marketing_lancamentos(ano_referencia)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_marketing_lancamentos_ano_mes ON marketing_lancamentos(ano_referencia, mes_referencia)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_marketing_lancamentos_regional ON marketing_lancamentos(regional)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_marketing_lancamentos_tipo_custo ON marketing_lancamentos(tipo_custo)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_marketing_lancamentos_tipo_status ON marketing_lancamentos(tipo_lancamento, status)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_marketing_orcamentos_ano ON marketing_orcamentos(ano_referencia)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_marketing_orcamentos_ano_mes ON marketing_orcamentos(ano_referencia, mes_referencia)');
    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_marketing_orcamentos_categoria ON marketing_orcamentos(categoria)');
    sqliteDb.run('CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_orcamentos_ano_mes_categoria ON marketing_orcamentos(ano_referencia, mes_referencia, LOWER(TRIM(categoria)))');

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

    console.log(`Conectado ao SQLite em: ${dbPath}`);
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
    sqliteDb.configure('busyTimeout', 10000);
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
