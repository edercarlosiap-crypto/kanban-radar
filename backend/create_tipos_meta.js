const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Criar tabela tipos_meta
db.run(`
  CREATE TABLE IF NOT EXISTS tipos_meta (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
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
`, (err) => {
  if (err) {
    console.error('Erro ao criar tabela:', err);
  } else {
    console.log('✓ Tabela tipos_meta criada com sucesso!');
    
    // Agora inserir os tipos de meta do banco
    const tiposMeta = [
      {
        id: 'meta-vendas',
        nome: 'Vendas',
        descricao: 'Comissão por vendas',
        meta1Volume: 95,
        meta1Percent: 0.05,
        meta1PercentIndividual: 1,
        meta2Volume: 76,
        meta2Percent: 0.03,
        meta2PercentIndividual: 0.5,
        meta3Volume: 61,
        meta3Percent: 0.01,
        meta3PercentIndividual: 0.3,
        incrementoGlobal: 0.4,
        pesoVendasChurn: 0.7
      },
      {
        id: 'meta-churn',
        nome: 'CHURN',
        descricao: 'Comissão por retenção/redução de churn',
        meta1Volume: null,
        meta1Percent: null,
        meta1PercentIndividual: null,
        meta2Volume: null,
        meta2Percent: null,
        meta2PercentIndividual: null,
        meta3Volume: null,
        meta3Percent: null,
        meta3PercentIndividual: null,
        incrementoGlobal: 0.4,
        pesoVendasChurn: null
      },
      {
        id: 'meta-mudanca-titularidade',
        nome: 'MUDANÇA DE TITULARIDADE',
        descricao: 'Comissão por mudança de titularidade',
        meta1Volume: 0,
        meta1Percent: 0,
        meta1PercentIndividual: 1,
        meta2Volume: 0,
        meta2Percent: 0,
        meta2PercentIndividual: 0,
        meta3Volume: 0,
        meta3Percent: 0,
        meta3PercentIndividual: 0,
        incrementoGlobal: 0.4,
        pesoVendasChurn: null
      },
      {
        id: 'meta-migracao-tecnologia',
        nome: 'MIGRAÇÃO DE TECNOLOGIA',
        descricao: 'Comissão por migração de tecnologia',
        meta1Volume: 0,
        meta1Percent: 0,
        meta1PercentIndividual: 1,
        meta2Volume: 0,
        meta2Percent: 0,
        meta2PercentIndividual: 0,
        meta3Volume: 0,
        meta3Percent: 0,
        meta3PercentIndividual: 0,
        incrementoGlobal: 0.4,
        pesoVendasChurn: null
      },
      {
        id: 'meta-renovacao',
        nome: 'RENOVAÇÃO',
        descricao: 'Comissão por renovação',
        meta1Volume: 0,
        meta1Percent: 0,
        meta1PercentIndividual: 1,
        meta2Volume: 0,
        meta2Percent: 0,
        meta2PercentIndividual: 0,
        meta3Volume: 0,
        meta3Percent: 0,
        meta3PercentIndividual: 0,
        incrementoGlobal: 0.4,
        pesoVendasChurn: null
      },
      {
        id: 'meta-plano-evento',
        nome: 'PLANO EVENTO',
        descricao: 'Comissão por plano evento',
        meta1Volume: 0,
        meta1Percent: 0,
        meta1PercentIndividual: 1,
        meta2Volume: 0,
        meta2Percent: 0,
        meta2PercentIndividual: 0,
        meta3Volume: 0,
        meta3Percent: 0,
        meta3PercentIndividual: 0,
        incrementoGlobal: 0.4,
        pesoVendasChurn: null
      },
      {
        id: 'meta-sva',
        nome: 'SVA',
        descricao: 'Comissão por serviços de valor agregado',
        meta1Volume: 0,
        meta1Percent: 0,
        meta1PercentIndividual: 1,
        meta2Volume: 0,
        meta2Percent: 0,
        meta2PercentIndividual: 0,
        meta3Volume: 0,
        meta3Percent: 0,
        meta3PercentIndividual: 0,
        incrementoGlobal: 0.4,
        pesoVendasChurn: null
      },
      {
        id: 'meta-telefonia',
        nome: 'TELEFONIA',
        descricao: 'Comissão por vendas de telefonia',
        meta1Volume: 0,
        meta1Percent: 0,
        meta1PercentIndividual: 1,
        meta2Volume: 0,
        meta2Percent: 0,
        meta2PercentIndividual: 0,
        meta3Volume: 0,
        meta3Percent: 0,
        meta3PercentIndividual: 0,
        incrementoGlobal: 0.4,
        pesoVendasChurn: null
      }
    ];

    let contador = 0;
    tiposMeta.forEach(tipo => {
      db.run(
        `INSERT OR IGNORE INTO tipos_meta 
         (id, nome, descricao, meta1Volume, meta1Percent, meta1PercentIndividual, 
          meta2Volume, meta2Percent, meta2PercentIndividual,
          meta3Volume, meta3Percent, meta3PercentIndividual, 
          incrementoGlobal, pesoVendasChurn)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tipo.id, tipo.nome, tipo.descricao,
          tipo.meta1Volume, tipo.meta1Percent, tipo.meta1PercentIndividual,
          tipo.meta2Volume, tipo.meta2Percent, tipo.meta2PercentIndividual,
          tipo.meta3Volume, tipo.meta3Percent, tipo.meta3PercentIndividual,
          tipo.incrementoGlobal, tipo.pesoVendasChurn
        ],
        (err) => {
          if (err) console.error('Erro ao inserir tipo:', tipo.nome, err);
          else {
            contador++;
            console.log(`✓ ${tipo.nome} inserido`);
          }
          
          if (contador === tiposMeta.length) {
            console.log('\n✓ Todos os tipos de meta foram inseridos!');
            db.close();
          }
        }
      );
    });
  }
});
