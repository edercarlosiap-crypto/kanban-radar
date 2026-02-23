const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('🔨 Criando tabelas faltando...');

// Tabela de Colaboradores PRIMEIRO
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
`, (err) => {
  if (err) console.error('Erro:', err);
  else console.log('✅ Tabela colaboradores criada');

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
  `, (err) => {
    if (err) console.error('Erro:', err);
    else console.log('✅ Tabela vendas_mensais criada');

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
    `, (err) => {
      if (err) console.error('Erro:', err);
      else console.log('✅ Tabela churn_regionais criada');

      db.run(`
        CREATE TABLE IF NOT EXISTS comissionamento_resumos (
          id TEXT PRIMARY KEY,
          periodo TEXT NOT NULL,
          regional_id TEXT NOT NULL,
          percentualVendasPonderado REAL DEFAULT 0,
          percentualChurnPonderado REAL DEFAULT 0,
          dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
          dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (periodo, regional_id),
          FOREIGN KEY (regional_id) REFERENCES regionais(id)
        )
      `, (err) => {
        if (err) console.error('Erro:', err);
        else console.log('✅ Tabela comissionamento_resumos criada');

        db.close();
        console.log('\n✅ Todas as tabelas foram criadas/verificadas!');
      });
    });
  });
});
