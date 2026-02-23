const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const db = new sqlite3.Database('./database.sqlite');

async function criarTabelas() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Criar tabela regionais
      db.run(`
        CREATE TABLE IF NOT EXISTS regionais (
          id TEXT PRIMARY KEY,
          nome TEXT NOT NULL UNIQUE,
          ativo INTEGER DEFAULT 1,
          dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Erro ao criar tabela regionais:', err);
          reject(err);
        } else {
          console.log('✓ Tabela regionais criada/verificada');
        }
      });

      // 2. Criar tabela tipos_meta
      db.run(`
        CREATE TABLE IF NOT EXISTS tipos_meta (
          id TEXT PRIMARY KEY,
          nome TEXT NOT NULL UNIQUE,
          descricao TEXT,
          meta1Volume INTEGER,
          meta1Percent REAL,
          meta1PercentIndividual REAL,
          meta2Volume INTEGER,
          meta2Percent REAL,
          meta2PercentIndividual REAL,
          meta3Volume INTEGER,
          meta3Percent REAL,
          meta3PercentIndividual REAL,
          incrementoGlobal REAL,
          pesoVendasChurn REAL,
          dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
          dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Erro ao criar tabela tipos_meta:', err);
          reject(err);
        } else {
          console.log('✓ Tabela tipos_meta criada/verificada');
        }
      });

      // 3. Criar tabela regras_comissao
      db.run(`
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
          meta2PercentIndividual REAL DEFAULT 0,
          meta1PercentIndividual REAL DEFAULT 0,
          meta3PercentIndividual REAL DEFAULT 0,
          FOREIGN KEY(regionalId) REFERENCES regionais(id)
        )
      `, (err) => {
        if (err) {
          console.error('Erro ao criar tabela regras_comissao:', err);
          reject(err);
        } else {
          console.log('✓ Tabela regras_comissao criada/verificada');
        }
      });

      // Inserir regionais padrão
      const regionais = [
        { id: uuidv4(), nome: 'Alta Floresta Doeste' },
        { id: uuidv4(), nome: 'Região Centro' },
        { id: uuidv4(), nome: 'Região Norte' },
        { id: uuidv4(), nome: 'Região Nordeste' },
        { id: uuidv4(), nome: 'Região Sul' },
      ];

      regionais.forEach(regional => {
        db.run(
          'INSERT OR IGNORE INTO regionais (id, nome) VALUES (?, ?)',
          [regional.id, regional.nome],
          (err) => {
            if (err && !err.message.includes('UNIQUE constraint failed')) {
              console.error('Erro ao inserir regional:', err);
            }
          }
        );
      });

      // Inserir tipos_meta padrão
      const tiposMeta = [
        {
          id: uuidv4(),
          nome: 'Vendas',
          descricao: 'Meta de vendas',
          meta1Volume: 150,
          meta1Percent: 8,
          meta1PercentIndividual: 1,
          meta2Volume: 120,
          meta2Percent: 5,
          meta2PercentIndividual: 0.5,
          meta3Volume: 100,
          meta3Percent: 3,
          meta3PercentIndividual: 0.3,
          incrementoGlobal: 0.05,
          pesoVendasChurn: 0.6
        },
        {
          id: uuidv4(),
          nome: 'CHURN',
          descricao: 'Meta de redução de churn',
          meta1Volume: 80,
          meta1Percent: 5,
          meta1PercentIndividual: 0.5,
          meta2Volume: 60,
          meta2Percent: 3,
          meta2PercentIndividual: 0.3,
          meta3Volume: 40,
          meta3Percent: 1,
          meta3PercentIndividual: 0.1,
          incrementoGlobal: 0.03,
          pesoVendasChurn: 0.8
        },
        {
          id: uuidv4(),
          nome: 'MUDANÇA DE TITULARIDADE',
          descricao: 'Meta de mudança de titularidade',
          meta1Volume: 100,
          meta1Percent: 4,
          meta1PercentIndividual: 0.4,
          meta2Volume: 80,
          meta2Percent: 2,
          meta2PercentIndividual: 0.2,
          meta3Volume: 60,
          meta3Percent: 1,
          meta3PercentIndividual: 0.1,
          incrementoGlobal: 0.02,
          pesoVendasChurn: 0.5
        },
        {
          id: uuidv4(),
          nome: 'MIGRAÇÃO DE TECNOLOGIA',
          descricao: 'Meta de migração de tecnologia',
          meta1Volume: 50,
          meta1Percent: 2,
          meta1PercentIndividual: 0.2,
          meta2Volume: 40,
          meta2Percent: 1,
          meta2PercentIndividual: 0.1,
          meta3Volume: 30,
          meta3Percent: 0.5,
          meta3PercentIndividual: 0.05,
          incrementoGlobal: 0.01,
          pesoVendasChurn: 0.3
        },
        {
          id: uuidv4(),
          nome: 'RENOVAÇÃO',
          descricao: 'Meta de renovação de contratos',
          meta1Volume: 120,
          meta1Percent: 6,
          meta1PercentIndividual: 0.6,
          meta2Volume: 100,
          meta2Percent: 4,
          meta2PercentIndividual: 0.4,
          meta3Volume: 80,
          meta3Percent: 2,
          meta3PercentIndividual: 0.2,
          incrementoGlobal: 0.04,
          pesoVendasChurn: 0.5
        },
        {
          id: uuidv4(),
          nome: 'PLANO EVENTO',
          descricao: 'Meta de plano evento',
          meta1Volume: 60,
          meta1Percent: 3,
          meta1PercentIndividual: 0.3,
          meta2Volume: 50,
          meta2Percent: 2,
          meta2PercentIndividual: 0.2,
          meta3Volume: 40,
          meta3Percent: 1,
          meta3PercentIndividual: 0.1,
          incrementoGlobal: 0.02,
          pesoVendasChurn: 0.4
        },
        {
          id: uuidv4(),
          nome: 'SVA',
          descricao: 'Meta de serviços de valor agregado',
          meta1Volume: 90,
          meta1Percent: 4,
          meta1PercentIndividual: 0.4,
          meta2Volume: 70,
          meta2Percent: 2.5,
          meta2PercentIndividual: 0.25,
          meta3Volume: 50,
          meta3Percent: 1.5,
          meta3PercentIndividual: 0.15,
          incrementoGlobal: 0.03,
          pesoVendasChurn: 0.5
        },
        {
          id: uuidv4(),
          nome: 'TELEFONIA',
          descricao: 'Meta de telefonia',
          meta1Volume: 40,
          meta1Percent: 2,
          meta1PercentIndividual: 0.2,
          meta2Volume: 30,
          meta2Percent: 1,
          meta2PercentIndividual: 0.1,
          meta3Volume: 20,
          meta3Percent: 0.5,
          meta3PercentIndividual: 0.05,
          incrementoGlobal: 0.01,
          pesoVendasChurn: 0.3
        }
      ];

      tiposMeta.forEach(tipo => {
        db.run(
          `INSERT OR IGNORE INTO tipos_meta (
            id, nome, descricao, meta1Volume, meta1Percent, meta1PercentIndividual,
            meta2Volume, meta2Percent, meta2PercentIndividual,
            meta3Volume, meta3Percent, meta3PercentIndividual,
            incrementoGlobal, pesoVendasChurn
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tipo.id, tipo.nome, tipo.descricao,
            tipo.meta1Volume, tipo.meta1Percent, tipo.meta1PercentIndividual,
            tipo.meta2Volume, tipo.meta2Percent, tipo.meta2PercentIndividual,
            tipo.meta3Volume, tipo.meta3Percent, tipo.meta3PercentIndividual,
            tipo.incrementoGlobal, tipo.pesoVendasChurn
          ],
          (err) => {
            if (err && !err.message.includes('UNIQUE constraint failed')) {
              console.error('Erro ao inserir tipo_meta:', err);
            }
          }
        );
      });

      setTimeout(() => {
        console.log('\n✅ Tabelas criadas e dados iniciais inseridos com sucesso!');
        resolve();
      }, 500);
    });
  });
}

criarTabelas()
  .then(() => {
    console.log('\n✓ Setup concluído');
    db.close();
  })
  .catch(err => {
    console.error('✗ Erro no setup:', err);
    db.close();
    process.exit(1);
  });
