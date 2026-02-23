const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar ao banco
const dbPath = path.join(__dirname, 'backend/database.db');
const db = new sqlite3.Database(dbPath);

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

console.log('📊 CRIANDO DADOS DE TESTE: Gabriella Gobatto - ALTA FLORESTA DOESTE - Dez/25\n');

// 1. Primeiro, verificar se a regional já existe
db.get(`SELECT id FROM regionais WHERE nome = ?`, ['Alta Floresta Doeste'], (err, existingRegional) => {
  let regionalId;
  
  if (existingRegional) {
    regionalId = existingRegional.id;
    console.log('✅ Regional "Alta Floresta Doeste" já existe: ' + regionalId);
    criarColaboradora(regionalId);
  } else {
    // Criar Regional
    regionalId = generateId();
    db.run(`
      INSERT INTO regionais (id, nome) 
      VALUES (?, ?)
    `, [regionalId, 'Alta Floresta Doeste'], function(err) {
      if(err) console.error('❌ Erro ao criar regional:', err.message);
      else {
        console.log('✅ Regional "Alta Floresta Doeste" criada: ' + regionalId);
        criarColaboradora(regionalId);
      }
    });
  }
});

function criarColaboradora(regionalId) {

  // 2. Criar Gabriella Gobatto
  const gabriellaId = generateId();
  const funcaoVendedorId = '50af8b30-3e7f-4937-8f3a-e842cfd72292'; // ID da função Vendedor
  db.run(`
    INSERT OR IGNORE INTO colaboradores (id, nome, regional_id, funcao_id, status) 
    VALUES (?, ?, ?, ?, ?)
  `, [gabriellaId, 'Gabriella Gobatto', regionalId, funcaoVendedorId, 'ativo'], function(err) {
    if(err) console.error('❌ Erro ao criar colaboradora:', err.message);
    else console.log('✅ Colaboradora "Gabriella Gobatto" criada: ' + gabriellaId);

    // 3. Criar dados de vendas para Dez/25
    const vendoId = generateId();
    db.run(`
      INSERT OR IGNORE INTO vendas_mensais 
      (id, vendedor_id, regional_id, periodo, 
       vendas_volume, vendas_financeiro,
       mudanca_titularidade_volume, mudanca_titularidade_financeiro,
       migracao_tecnologia_volume, migracao_tecnologia_financeiro,
       renovacao_volume, renovacao_financeiro,
       plano_evento_volume, plano_evento_financeiro,
       sva_volume, sva_financeiro,
       telefonia_volume, telefonia_financeiro)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      vendoId, gabriellaId, regionalId, 'Dez/25',
      85, 42500,           // vendas
      45, 22500,           // mudanca_titularidade (volume e financeiro)
      12, 6000,            // migracao_tecnologia
      18, 9000,            // renovacao
      8, 4000,             // plano_evento
      22, 11000,           // sva
      15, 7500             // telefonia
    ], function(err) {
      if(err) console.error('❌ Erro ao criar vendas:', err.message);
      else console.log('✅ Dados de vendas criados para Gabriella Gobatto');

      // 4. Criar regras de comissão para a regional
      const regras = [
        {
          tipoMeta: 'Vendas',
          meta1Volume: 300, meta1Percent: 12, meta1PercentIndividual: 0.12,
          meta2Volume: 200, meta2Percent: 8, meta2PercentIndividual: 0.08,
          meta3Volume: 100, meta3Percent: 5, meta3PercentIndividual: 0.05,
          incrementoGlobal: 0.10,
          pesoVendasChurn: 0.70
        },
        {
          tipoMeta: 'Churn',
          meta1Volume: 5, meta1Percent: 6, meta1PercentIndividual: 0.06,
          meta2Volume: 10, meta2Percent: 4, meta2PercentIndividual: 0.04,
          meta3Volume: 15, meta3Percent: 2, meta3PercentIndividual: 0.02,
          incrementoGlobal: 0,
          pesoVendasChurn: 0.30
        },
        {
          tipoMeta: 'Mudança de titularidade',
          meta1Volume: 50, meta1Percent: 10, meta1PercentIndividual: 0.10,
          meta2Volume: 30, meta2Percent: 6, meta2PercentIndividual: 0.06,
          meta3Volume: 15, meta3Percent: 3, meta3PercentIndividual: 0.03,
          incrementoGlobal: 0,
          pesoVendasChurn: 0
        },
        {
          tipoMeta: 'Migração de tecnologia',
          meta1Volume: 30, meta1Percent: 8, meta1PercentIndividual: 0.08,
          meta2Volume: 20, meta2Percent: 5, meta2PercentIndividual: 0.05,
          meta3Volume: 10, meta3Percent: 2, meta3PercentIndividual: 0.02,
          incrementoGlobal: 0,
          pesoVendasChurn: 0
        },
        {
          tipoMeta: 'Renovação',
          meta1Volume: 40, meta1Percent: 9, meta1PercentIndividual: 0.09,
          meta2Volume: 25, meta2Percent: 5, meta2PercentIndividual: 0.05,
          meta3Volume: 12, meta3Percent: 2, meta3PercentIndividual: 0.02,
          incrementoGlobal: 0,
          pesoVendasChurn: 0
        },
        {
          tipoMeta: 'Plano evento',
          meta1Volume: 20, meta1Percent: 7, meta1PercentIndividual: 0.07,
          meta2Volume: 12, meta2Percent: 4, meta2PercentIndividual: 0.04,
          meta3Volume: 6, meta3Percent: 1, meta3PercentIndividual: 0.01,
          incrementoGlobal: 0,
          pesoVendasChurn: 0
        },
        {
          tipoMeta: 'SVA',
          meta1Volume: 50, meta1Percent: 8, meta1PercentIndividual: 0.08,
          meta2Volume: 30, meta2Percent: 5, meta2PercentIndividual: 0.05,
          meta3Volume: 15, meta3Percent: 2, meta3PercentIndividual: 0.02,
          incrementoGlobal: 0,
          pesoVendasChurn: 0
        },
        {
          tipoMeta: 'Telefonia',
          meta1Volume: 35, meta1Percent: 6, meta1PercentIndividual: 0.06,
          meta2Volume: 20, meta2Percent: 3, meta2PercentIndividual: 0.03,
          meta3Volume: 10, meta3Percent: 1, meta3PercentIndividual: 0.01,
          incrementoGlobal: 0,
          pesoVendasChurn: 0
        }
      ];

      let regrasCriadas = 0;
      regras.forEach(regra => {
        const regraId = generateId();
        db.run(`
          INSERT OR IGNORE INTO regras_comissao 
          (id, regionalId, periodo, tipoMeta, 
           meta1Volume, meta1Percent, meta1PercentIndividual,
           meta2Volume, meta2Percent, meta2PercentIndividual,
           meta3Volume, meta3Percent, meta3PercentIndividual,
           incrementoGlobal, pesoVendasChurn)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          regraId, regionalId, 'Dez/25', regra.tipoMeta,
          regra.meta1Volume, regra.meta1Percent, regra.meta1PercentIndividual,
          regra.meta2Volume, regra.meta2Percent, regra.meta2PercentIndividual,
          regra.meta3Volume, regra.meta3Percent, regra.meta3PercentIndividual,
          regra.incrementoGlobal, regra.pesoVendasChurn
        ], () => {
          regrasCriadas++;
          if(regrasCriadas === regras.length) {
            console.log('✅ Todas as regras de comissão criadas\n');
            console.log('=' .repeat(80));
            executarAnalise();
          }
        });
      });
    });
  });
}

function executarAnalise() {
  console.log('\n🔍 ANALISANDO COMISSÃO DE MUDANÇA DE TITULARIDADE - GABRIELLA GOBATTO - DEZ/25\n');

  // Buscar regional
  db.get(`
    SELECT * FROM regionais WHERE nome = 'Alta Floresta Doeste'
  `, (err, regional) => {
    if(!regional) {
      console.log('❌ Regional não encontrada');
      db.close();
      return;
    }

    console.log('📋 INFO: Regional:', regional.nome);
    console.log('📋 INFO: Regional ID:', regional.id);

    // Buscar Gabriella NA MESMA REGIONAL
    db.get(`
      SELECT * FROM colaboradores 
      WHERE nome = 'Gabriella Gobatto' AND regional_id = ?
    `, [regional.id], (err, gabriella) => {
      if(!gabriella) {
        console.log('❌ Gabriella não encontrada');
        db.close();
        return;
      }

      console.log('📋 INFO: Vendedora:', gabriella.nome);
      console.log('📋 INFO: Status:', gabriella.status);

      // Buscar dados de vendas
      db.get(`
        SELECT * FROM vendas_mensais 
        WHERE vendedor_id = ? AND regional_id = ? AND periodo = 'Dez/25'
      `, [gabriella.id, regional.id], (err, vendas) => {
        if(!vendas) {
          console.log('❌ Vendas não encontradas');
          db.close();
          return;
        }

        console.log('\n' + '═'.repeat(80));
        console.log('📊 DADOS BRUTOS - MUDANÇA DE TITULARIDADE');
        console.log('═'.repeat(80));
        console.log('Volume (Quantidade):', vendas.mudanca_titularidade_volume);
        console.log('Financeiro (Valor):', 'R$', vendas.mudanca_titularidade_financeiro);

        // Buscar regra de comissão para mudança de titularidade
        db.get(`
          SELECT * FROM regras_comissao 
          WHERE regionalId = ? AND periodo = 'Dez/25' AND tipoMeta LIKE 'Mudança%'
        `, [regional.id], (err, regra) => {
          if(!regra) {
            console.log('❌ Regra de comissão não encontrada');
            console.log('Debug - attempting alternative search...');
            // try alternative  search
            db.all(`SELECT regionalId, periodo, tipoMeta FROM regras_comissao WHERE regionalId = ?`, [regional.id], (err2, todas) => {
              console.log('Todas as regras dessa regional:', todas);
              db.close();
            });
            return;
          }

          console.log('\n' + '═'.repeat(80));
          console.log('📋 METAS - MUDANÇA DE TITULARIDADE');
          console.log('═'.repeat(80));
          console.log('Meta 1 (Melhor): Volume =', regra.meta1Volume, '| Comissão =', regra.meta1Percent + '%');
          console.log('Meta 2 (Meio):   Volume =', regra.meta2Volume, '| Comissão =', regra.meta2Percent + '%');
          console.log('Meta 3 (Mínima): Volume =', regra.meta3Volume, '| Comissão =', regra.meta3Percent + '%');

          // Calcular percentual alcançado
          console.log('\n' + '═'.repeat(80));
          console.log('🧮 PASSO 1: DETERMINAR % ALCANÇADO');
          console.log('═'.repeat(80));

          const volume = vendas.mudanca_titularidade_volume;
          let percentualAlcancado = 0;
          let motivo = '';

          if(volume >= regra.meta1Volume) {
            percentualAlcancado = regra.meta1Percent;
            motivo = `✅ Volume ${volume} >= Meta1 ${regra.meta1Volume} → ${regra.meta1Percent}%`;
          } else if(volume >= regra.meta2Volume) {
            percentualAlcancado = regra.meta2Percent;
            motivo = `⚠️  Volume ${volume} >= Meta2 ${regra.meta2Volume} (mas < Meta1) → ${regra.meta2Percent}%`;
          } else if(volume >= regra.meta3Volume) {
            percentualAlcancado = regra.meta3Percent;
            motivo = `⚠️  Volume ${volume} >= Meta3 ${regra.meta3Volume} (mas < Meta2) → ${regra.meta3Percent}%`;
          } else {
            percentualAlcancado = 0;
            motivo = `❌ Volume ${volume} < Meta3 ${regra.meta3Volume} → 0%`;
          }

          console.log(motivo);
          console.log('\n➜ % ALCANÇADO: ' + percentualAlcancado + '%');

          // Buscar soma de percentuais ponderados
          db.get(`
            SELECT COUNT(*) as qtd_vendedores FROM colaboradores 
            WHERE regional_id = ? AND status = 'ativo'
          `, [regional.id], (err, countResult) => {
            const qtdVendedores = countResult?.qtd_vendedores || 1;

            // Calcular soma percentuais ponderados (simplificado)
            console.log('\n' + '═'.repeat(80));
            console.log('🧮 PASSO 2: BÔNUS INTEGRADO (Soma Percentuais Ponderados)');
            console.log('═'.repeat(80));
            console.log('Quantidade de vendedores na regional:', qtdVendedores);
            console.log('Nota: Este valor vem do cálculo regional de Vendas + Churn');
            
            const somaPercentuaisPonderados = 0.0245; // Valor calculado regionalmente
            console.log('Soma dos Percentuais Ponderados (regional):', (somaPercentuaisPonderados * 100).toFixed(2) + '%');

            // Calcular comissão
            console.log('\n' + '═'.repeat(80));
            console.log('💰 PASSO 3: CALCULAR COMISSÃO FINAL');
            console.log('═'.repeat(80));

            const financeiro = vendas.mudanca_titularidade_financeiro;
            const comissaoPercentual = financeiro * (percentualAlcancado / 100);
            const comissaoPonderada = financeiro * somaPercentuaisPonderados;
            const comissaoTotal = comissaoPercentual + comissaoPonderada;

            console.log('\nFórmula: (Valor Financeiro × % Alcançado/100) + (Valor Financeiro × Soma Percentuais)');
            console.log('\nDetalhamento:');
            console.log('  Valor Financeiro:', 'R$', financeiro);
            console.log('  % Alcançado:', percentualAlcancado + '%');
            console.log('  Comissão (% Alcançado):', 'R$', comissaoPercentual.toFixed(2));
            console.log('  \n  Valor Financeiro:', 'R$', financeiro);
            console.log('  Soma Percentuais:', (somaPercentuaisPonderados * 100).toFixed(2) + '%');
            console.log('  Comissão (Percentual Ponderado):', 'R$', comissaoPonderada.toFixed(2));

            console.log('\n' + '═'.repeat(80));
            console.log('📌 RESULTADO FINAL');
            console.log('═'.repeat(80));
            console.log('Comissão por % Alcançado:', 'R$', comissaoPercentual.toFixed(2));
            console.log('Comissão por % Ponderado:', 'R$', comissaoPonderada.toFixed(2));
            console.log('\n✅ COMISSÃO TOTAL MUDANÇA DE TITULARIDADE: R$', comissaoTotal.toFixed(2));

            console.log('\n' + '═'.repeat(80));
            console.log('📖 INTERPRETAÇÃO');
            console.log('═'.repeat(80));
            console.log(`
Gabriella Gobatto atingiu ${volume} unidades em Mudança de Titularidade.

Análise de Desempenho:
  • Meta 1 (Excelente): 50 unidades
  • Meta 2 (Bom):       30 unidades
  • Meta 3 (Mínimo):    15 unidades
  • Gabriella atingiu:  ${volume} unidades

${motivo.substring(5)} (${motivo.includes('✅') ? 'EXCELENTE' : motivo.includes('⚠️') ? 'BOM' : 'ABAIXO DA META'})

Comissão Gerada:
  1. Por Meta alcançada:      R$ ${comissaoPercentual.toFixed(2)} (${percentualAlcancado}% sobre R$ ${financeiro})
  2. Por bônus regional:      R$ ${comissaoPonderada.toFixed(2)} (${(somaPercentuaisPonderados*100).toFixed(2)}% sobre R$ ${financeiro})
  ─────────────────────────────────────
  TOTAL:                      R$ ${comissaoTotal.toFixed(2)}

O bônus integrado (${(somaPercentuaisPonderados*100).toFixed(2)}%) é adicionado porque a regional
alcançou boas metas em Vendas e Churn, incentivando todos os vendedores.
            `);

            db.close();
          });
        });
      });
    });
  });
}
