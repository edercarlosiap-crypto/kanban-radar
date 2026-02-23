const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Verificando e populando dados reais...\n');

// Buscar regionais
db.all('SELECT * FROM regionais', (err, regionais) => {
  if (!regionais || regionais.length === 0) {
    console.log('❌ Nenhuma regional encontrada');
    db.close();
    return;
  }

  console.log(`✅ ${regionais.length} regionais encontradas\n`);

  // Buscar colaboradores
  db.get('SELECT COUNT(*) as total FROM colaboradores', (err, colabCount) => {
    console.log(`Colaboradores: ${colabCount.total}`);

    // Se não houver colaboradores, criar alguns
    if (colabCount.total === 0) {
      console.log('Criando colaboradores...');
      const nomes = ['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira'];
      
      let criados = 0;
      nomes.forEach((nome, idx) => {
        db.run(
          `INSERT INTO colaboradores (id, nome, regional_id, status) 
           VALUES (?, ?, ?, 'ativo')`,
          [
            `col-${idx + 1}`,
            nome,
            regionais[0].id
          ],
          function(err) {
            criados++;
            if (criados === nomes.length) {
              console.log(`✅ ${criados} colaboradores criados\n`);
              popularVendas();
            }
          }
        );
      });
    } else {
      popularVendas();
    }
  });

  function popularVendas() {
    // Buscar vendas existentes
    db.get(
      'SELECT COUNT(*) as total FROM vendas_mensais WHERE periodo = ?',
      ['Jan/25'],
      (err, vendCount) => {
        console.log(`Vendas em Jan/25: ${vendCount.total}`);

        // Se não houver vendas, criar algumas
        if (vendCount.total === 0) {
          console.log('Criando dados de vendas para Jan/25...');
          
          const vendas = [
            { volume: 120, financeiro: 15000, alcancado: 85 },
            { volume: 95, financeiro: 12000, alcancado: 70 },
            { volume: 150, financeiro: 18000, alcancado: 95 },
            { volume: 80, financeiro: 10000, alcancado: 60 }
          ];

          let criadas = 0;
          db.all('SELECT id FROM colaboradores', (err, colaboradores) => {
            if (colaboradores.length > 0) {
              vendas.forEach((venda, idx) => {
                const colab = colaboradores[idx % colaboradores.length];
                db.run(
                  `INSERT INTO vendas_mensais 
                   (vendedor_id, regional_id, periodo, vendas_volume, vendas_financeiro, percentual_alcancado) 
                   VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    colab.id,
                    regionais[0].id,
                    'Jan/25',
                    venda.volume,
                    venda.financeiro,
                    venda.alcancado
                  ],
                  function(err) {
                    criadas++;
                    if (criadas === vendas.length) {
                      console.log(`✅ ${criadas} vendas criadas\n`);
                      popularChurn();
                    }
                  }
                );
              });
            }
          });
        } else {
          popularChurn();
        }
      }
    );
  }

  function popularChurn() {
    // Buscar churn existente
    db.get(
      'SELECT COUNT(*) as total FROM churn_regionais WHERE periodo = ?',
      ['Jan/25'],
      (err, churnCount) => {
        console.log(`Churn em Jan/25: ${churnCount.total}`);

        // Se não houver churn, criar alguns
        if (churnCount.total === 0) {
          console.log('Criando dados de churn para Jan/25...');
          
          regionais.forEach((regional, idx) => {
            db.run(
              `INSERT INTO churn_regionais (regional_id, periodo, churn) 
               VALUES (?, ?, ?)`,
              [regional.id, 'Jan/25', Math.floor(Math.random() * 8)],
              function(err) {
                if (idx === regionais.length - 1) {
                  console.log(`✅ ${regionais.length} registros de churn criados\n`);
                  listaDados();
                }
              }
            );
          });
        } else {
          listaDados();
        }
      }
    );
  }

  function listaDados() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 DADOS DISPONÍVEIS NO BANCO');
    console.log('='.repeat(70));
    
    db.get('SELECT COUNT(*) as total FROM colaboradores', (err, result) => {
      console.log(`\nColaboradores: ${result.total}`);
    });

    db.get(
      'SELECT COUNT(*) as total FROM vendas_mensais WHERE periodo = ?',
      ['Jan/25'],
      (err, result) => {
        console.log(`Vendas (Jan/25): ${result.total}`);
      }
    );

    db.get(
      'SELECT COUNT(*) as total FROM churn_regionais WHERE periodo = ?',
      ['Jan/25'],
      (err, result) => {
        console.log(`Churn (Jan/25): ${result.total}`);
      }
    );

    db.get(
      'SELECT COUNT(*) as total FROM regras_comissao',
      (err, result) => {
        console.log(`Regras de comissão: ${result.total}`);
        console.log('\n✅ Banco pronto para análise!\n');
        db.close();
      }
    );
  }
});
