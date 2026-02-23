const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Função simples para gerar UUIDs
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

console.log('Criando regional "Alta Floresta Doeste" e populando dados...\n');

const regionalId = generateId();
const periodo = 'Dez/25';

// 1. Criar a regional
db.run(
  `INSERT INTO regionais (id, nome) VALUES (?, ?)`,
  [regionalId, 'Alta Floresta Doeste'],
  function(err) {
    if (err) {
      console.error('❌ Erro ao criar regional:', err);
      db.close();
      return;
    }
    console.log(`✅ Regional "Alta Floresta Doeste" criada`);
    console.log(`   ID: ${regionalId}\n`);

    // 2. Criar colaboradores para essa regional
    const vendedores = [
      'Carlos Fernando Silva',
      'Patricia Alves',
      'Gustavo Ferreira',
      'Fernanda Costa'
    ];

    let criadosVendedores = 0;
    const vendedoresIds = [];

    vendedores.forEach((nome, idx) => {
      const vendId = generateId();
      vendedoresIds.push(vendId);
      
      db.run(
        `INSERT INTO colaboradores (id, nome, regional_id, status) VALUES (?, ?, ?, 'ativo')`,
        [vendId, nome, regionalId],
        function(err) {
          criadosVendedores++;
          if (criadosVendedores === vendedores.length) {
            console.log(`✅ ${criadosVendedores} vendedores criados\n`);
            criarVendas();
          }
        }
      );
    });

    function criarVendas() {
      // 3. Criar dados de vendas para Dez/25
      const vendasData = [
        { volume: 85, financeiro: 11000 },
        { volume: 95, financeiro: 12500 },
        { volume: 120, financeiro: 15000 },
        { volume: 110, financeiro: 13500 }
      ];

      let criadosVendas = 0;
      vendasData.forEach((venda, idx) => {
        db.run(
          `INSERT INTO vendas_mensais 
           (vendedor_id, regional_id, periodo, vendas_volume, vendas_financeiro) 
           VALUES (?, ?, ?, ?, ?)`,
          [vendedoresIds[idx], regionalId, periodo, venda.volume, venda.financeiro],
          function(err) {
            criadosVendas++;
            if (criadosVendas === vendasData.length) {
              console.log(`✅ ${criadosVendas} registros de vendas criados (${periodo})\n`);
              criarChurn();
            }
          }
        );
      });
    }

    function criarChurn() {
      // 4. Criar dados de churn
      db.run(
        `INSERT INTO churn_regionais (regional_id, periodo, churn) 
         VALUES (?, ?, ?)`,
        [regionalId, periodo, 3],
        function(err) {
          console.log(`✅ Churn criado: 3 unidades (${periodo})\n`);
          criarRegras();
        }
      );
    }

    function criarRegras() {
      // 5. Criar regras de comissão
      const regras = [
        {
          tipoMeta: 'Vendas',
          meta1Volume: 150,
          meta1Percent: 12,
          meta2Volume: 100,
          meta2Percent: 8,
          meta3Volume: 75,
          meta3Percent: 5,
          pesoVendasChurn: 0.70,
          incrementoGlobal: 0
        },
        {
          tipoMeta: 'Churn',
          meta1Volume: 5,
          meta1Percent: 6,
          meta2Volume: 10,
          meta2Percent: 4,
          meta3Volume: 15,
          meta3Percent: 2,
          pesoVendasChurn: 0.30,
          incrementoGlobal: 0
        }
      ];

      let criadosRegras = 0;
      regras.forEach(regra => {
        db.run(
          `INSERT INTO regras_comissao (
            regionalId, tipoMeta, meta1Volume, meta1Percent, 
            meta2Volume, meta2Percent, meta3Volume, meta3Percent,
            pesoVendasChurn, incrementoGlobal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            regionalId, regra.tipoMeta, regra.meta1Volume, regra.meta1Percent,
            regra.meta2Volume, regra.meta2Percent, regra.meta3Volume, regra.meta3Percent,
            regra.pesoVendasChurn, regra.incrementoGlobal
          ],
          function(err) {
            criadosRegras++;
            if (criadosRegras === regras.length) {
              console.log(`✅ ${criadosRegras} regras de comissão criadas\n`);
              console.log('='.repeat(70));
              console.log('✅ SETUP COMPLETO!');
              console.log('='.repeat(70));
              console.log('\nDados criados para Alta Floresta Doeste (Dez/25):');
              console.log(`  • 4 vendedores`);
              console.log(`  • 4 registros de vendas`);
              console.log(`  • Churn: 3 unidades`);
              console.log(`  • 2 regras de comissão (Vendas + Churn)\n`);
              db.close();
            }
          }
        );
      });
    }
  }
);
