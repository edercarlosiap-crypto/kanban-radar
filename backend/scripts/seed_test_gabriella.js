const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// IDs do setup
const MARIA_ID = '3603c70c-d3e4-4109-86e8-194fb69f0ef2';
const JOAO_ID = 'ca4db12f-1358-4c56-bc0d-e8cfef63cdc9';
const PEDRO_ID = '8e15e14e-8089-4235-8406-fe6d8732b10d';
const ANA_ID = '4a028fd9-a3ce-4a9b-bb05-93775def7e20';

// Regional São Paulo (onde Maria está)
const REGIONAL_SP_ID = 'e78ea0b6-c672-4af9-bac9-87f576d0257d';

const periodo = 'Dez/25';

db.serialize(() => {
  console.log('📊 Criando regra de comissão para Dez/25...\n');
  
  // Inserir regra de comissão (igual ao teste anterior)
  db.run(`
    INSERT OR REPLACE INTO regras_comissao (
      periodo, regional_id, tipo_meta, 
      meta1Volume, meta2Volume, meta3Volume,
      meta1PercentIndividual, meta2PercentIndividual, meta3PercentIndividual,
      incrementoGlobal, ativo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    periodo, REGIONAL_SP_ID, 'vendas',
    '95,0', '76,0', '61,0',  // Metas com vírgula como no DB original
    0.05, 0.03, 0.01,
    0.4, 1
  ], function(err) {
    if (err) {
      console.error('❌ Erro ao criar regra:', err);
    } else {
      console.log('✅ Regra de comissão criada');
    }
  });

  console.log('\n👥 Criando vendas para colaboradores...\n');

  // Maria Santos - 24 volume (deve dar tier 3 = 1%)
  // metaIndividual3 = (61/4) * 1.4 = 21.35
  // 24 >= 21.35 ✓
  db.run(`
    INSERT OR REPLACE INTO vendas_mensais (
      vendedor_id, regional_id, periodo,
      vendas_volume, vendas_financeiro
    ) VALUES (?, ?, ?, ?, ?)
  `, [MARIA_ID, REGIONAL_SP_ID, periodo, 24, 2458.30], function(err) {
    if (err) {
      console.error('❌ Erro Maria:', err);
    } else {
      console.log('✅ Maria Santos: 24 volume, R$ 2458,30 (deve ser tier 3 = 1%)');
    }
  });

  // João Silva - 30 volume (deve dar tier 2 = 3%)
  // metaIndividual2 = (76/4) * 1.4 = 26.6
  // 30 >= 26.6 ✓
  db.run(`
    INSERT OR REPLACE INTO vendas_mensais (
      vendedor_id, regional_id, periodo,
      vendas_volume, vendas_financeiro
    ) VALUES (?, ?, ?, ?, ?)
  `, [JOAO_ID, REGIONAL_SP_ID, periodo, 30, 3500.00], function(err) {
    if (err) {
      console.error('❌ Erro João:', err);
    } else {
      console.log('✅ João Silva: 30 volume, R$ 3500,00 (deve ser tier 2 = 3%)');
    }
  });

  // Pedro Costa - 35 volume (deve dar tier 1 = 5%)
  // metaIndividual1 = (95/4) * 1.4 = 33.25
  // 35 >= 33.25 ✓
  db.run(`
    INSERT OR REPLACE INTO vendas_mensais (
      vendedor_id, regional_id, periodo,
      vendas_volume, vendas_financeiro
    ) VALUES (?, ?, ?, ?, ?)
  `, [PEDRO_ID, REGIONAL_SP_ID, periodo, 35, 4200.00], function(err) {
    if (err) {
      console.error('❌ Erro Pedro:', err);
    } else {
      console.log('✅ Pedro Costa: 35 volume, R$ 4200,00 (deve ser tier 1 = 5%)');
    }
  });

  // Ana Paula - 18 volume (abaixo de meta3, deve dar 0%)
  // 18 < 21.35 ✗
  db.run(`
    INSERT OR REPLACE INTO vendas_mensais (
      vendedor_id, regional_id, periodo,
      vendas_volume, vendas_financeiro
    ) VALUES (?, ?, ?, ?, ?)
  `, [ANA_ID, REGIONAL_SP_ID, periodo, 18, 1800.00], function(err) {
    if (err) {
      console.error('❌ Erro Ana:', err);
    } else {
      console.log('✅ Ana Paula: 18 volume, R$ 1800,00 (deve ser 0% - não atingiu meta)');
    }
  });

  setTimeout(() => {
    console.log('\n📋 Resumo dos Cálculos Esperados:');
    console.log('=================================');
    console.log('Total Vendedores na regional: 4');
    console.log('Incremento Global: 40%');
    console.log('');
    console.log('Meta Individual 1: (95/4) × 1.4 = 33.25 → 5%');
    console.log('Meta Individual 2: (76/4) × 1.4 = 26.60 → 3%');
    console.log('Meta Individual 3: (61/4) × 1.4 = 21.35 → 1%');
    console.log('');
    console.log('🎯 Resultados Esperados:');
    console.log('  • Maria (24 vol): 24 >= 21.35 → 1%');
    console.log('  • João (30 vol): 30 >= 26.60 → 3%');
    console.log('  • Pedro (35 vol): 35 >= 33.25 → 5%');
    console.log('  • Ana (18 vol): 18 < 21.35 → 0%');
    console.log('\n✅ Dados inseridos! Teste a API agora.\n');
    
    db.close();
  }, 500);
});
