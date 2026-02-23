const { db_get, db_all } = require('../config/database');

const normalizarNumero = (valor) => {
  if (valor === null || valor === undefined) return NaN;
  return Number(String(valor).replace(',', '.'));
};

const normalizarPercentual = (valor) => {
  const numero = normalizarNumero(valor);
  if (Number.isNaN(numero)) return 0;
  return numero > 1 ? numero / 100 : numero;
};

const normalizarPeso = (valor, padrao = 0.5) => {
  const numero = normalizarNumero(valor);
  if (Number.isNaN(numero)) return padrao;
  const normalizado = numero > 1 ? numero / 100 : numero;
  return Math.min(1, Math.max(0, normalizado));
};

/**
 * Calcula o percentual de comissão baseado nas metas em degraus
 * @param {number} valorAtingido 
 * @param {object} meta - Contém meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent
 * @param {boolean} inverterPolaridade - Quando true, menor valor e melhor (churn)
 * @returns {number} Percentual calculado
 */
const calcularPercentualPorMeta = (valorAtingido, meta, inverterPolaridade = false) => {
  if (!meta || valorAtingido === 0) return 0;

  const meta1Volume = normalizarNumero(meta.meta1Volume);
  const meta2Volume = normalizarNumero(meta.meta2Volume);
  const meta3Volume = normalizarNumero(meta.meta3Volume);
  if ([meta1Volume, meta2Volume, meta3Volume].some(Number.isNaN)) return 0;

  const meta1Percent = normalizarPercentual(meta.meta1Percent);
  const meta2Percent = normalizarPercentual(meta.meta2Percent);
  const meta3Percent = normalizarPercentual(meta.meta3Percent);

  console.log('🐛 [calcularPercentualPorMeta] ENTRADA:', {
    valorAtingido,
    meta,
    inverterPolaridade,
    meta1Percent, meta2Percent, meta3Percent
  });

  if (inverterPolaridade) {
    // Churn: quanto menor, melhor
    if (valorAtingido <= meta1Volume) {
      console.log('🐛 Churn: retorna meta1Percent =', meta1Percent);
      return meta1Percent;
    }
    if (valorAtingido <= meta2Volume) {
      console.log('🐛 Churn: retorna meta2Percent =', meta2Percent);
      return meta2Percent;
    }
    if (valorAtingido <= meta3Volume) {
      console.log('🐛 Churn: retorna meta3Percent =', meta3Percent);
      return meta3Percent;
    }
  } else {
    // Vendas: quanto maior, melhor - CORRIGIDO: verifica meta3 (menor) primeiro
    console.log(`🐛 Vendas: ${valorAtingido} >= ${meta3Volume}? ${valorAtingido >= meta3Volume}`);
    if (valorAtingido >= meta3Volume) {
      console.log(`🐛 Vendas: ${valorAtingido} >= ${meta2Volume}? ${valorAtingido >= meta2Volume}`);
      if (valorAtingido >= meta2Volume) {
        console.log(`🐛 Vendas: ${valorAtingido} >= ${meta1Volume}? ${valorAtingido >= meta1Volume}`);
        if (valorAtingido >= meta1Volume) {
          console.log('🐛 Vendas: retorna meta1Percent =', meta1Percent);
          return meta1Percent;
        } else {
          console.log('🐛 Vendas: retorna meta2Percent =', meta2Percent);
          return meta2Percent;
        }
      } else {
        console.log('🐛 Vendas: retorna meta3Percent =', meta3Percent);
        return meta3Percent;
      }
    }
  }
  
  console.log('🐛 Abaixo da meta mínima: retorna 0');
  return 0;
};

/**
 * Endpoint: GET /api/comissionamento?periodo=Jan/25&regionalId=uuid
 * Calcula comissionamento com todos os passos detalhados
 */
exports.calcularComissionamento = async (req, res) => {
  try {
    const { periodo, regionalId } = req.query;

    if (!periodo || !regionalId) {
      return res.status(400).json({ 
        erro: 'Período e regionalId são obrigatórios' 
      });
    }

    // 1) Buscar informações da regional
    const regional = await db_get(
      'SELECT id, nome FROM regionais WHERE id = ?',
      [regionalId]
    );

    if (!regional) {
      return res.status(404).json({ erro: 'Regional não encontrada' });
    }

    // 2) Buscar quantidade de vendedores da regional
    const resultVendedores = await db_get(
      "SELECT COUNT(*) as qtd FROM colaboradores WHERE regional_id = ? AND status = 'ativo'",
      [regionalId]
    );
    const qtdVendedores = resultVendedores?.qtd || 0;

    // 3) Buscar regras de comissão (metas, pesos, incremento global)
    const metaVendas = await db_get(`
      SELECT 
        meta1Volume, meta1Percent,
        meta2Volume, meta2Percent,
        meta3Volume, meta3Percent,
        incrementoGlobal,
        pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'vendas'
    `, [regionalId, periodo]);

    const metaChurn = await db_get(`
      SELECT 
        meta1Volume, meta1Percent,
        meta2Volume, meta2Percent,
        meta3Volume, meta3Percent
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'churn'
    `, [regionalId, periodo]);

    if (!metaVendas && !metaChurn) {
      return res.status(404).json({ 
        erro: 'Nenhuma regra de comissão encontrada para esta regional e período' 
      });
    }

    // 3) Incremento sobre meta global
    const incrementoGlobal = normalizarPercentual(metaVendas?.incrementoGlobal || 0);

    // 4) Buscar o realizado de vendas (soma de todas as categorias de vendas)
    const vendasResult = await db_all(`
      SELECT 
        SUM(vendas_volume) as vendas
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);

    const vendasData = vendasResult[0] || {};
    const totalVendasRealizado = vendasData.vendas || 0;

    // 5) Comparar realizado de vendas com meta e calcular percentual
    const percentualVendas = metaVendas 
      ? calcularPercentualPorMeta(totalVendasRealizado, metaVendas)
      : 0;

    // 6) Peso Vendas/Churn (pesoVendasChurn = peso de vendas)
    // Exemplo: se pesoVendasChurn = 0.4, então peso vendas = 40%, peso churn = 60%
    const pesoVendasChurn = normalizarPeso(metaVendas?.pesoVendasChurn, 0.5); // Padrão 50/50
    const pesoVendas = pesoVendasChurn; // Este é o peso de vendas (0 a 1)
    const pesoChurn = 1 - pesoVendasChurn; // O complemento é o peso de churn

    // 7) Percentual obtido × peso de vendas
    const percentualVendasPonderado = percentualVendas * pesoVendas;

    // 8) Buscar realizado de churn
    const churnResult = await db_get(`
      SELECT churn
      FROM churn_regionais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);

    const totalChurnRealizado = churnResult?.churn || 0;

    // 10) Comparar realizado de churn com meta e calcular percentual
    const percentualChurn = metaChurn
      ? calcularPercentualPorMeta(totalChurnRealizado, metaChurn, true)
      : 0;

    // 12) Percentual churn × peso de churn
    const percentualChurnPonderado = percentualChurn * pesoChurn;

    // ===== BUSCAR OUTROS TIPOS DE MÉTRICAS =====
    
    // Mudança de titularidade
    const metaMudancaTitularidade = await db_get(`
      SELECT meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'mudança de titularidade'
    `, [regionalId, periodo]);

    const mudancaTitularidadeResult = await db_all(`
      SELECT SUM(mudanca_titularidade_volume) as total
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    const totalMudancaTitularidade = mudancaTitularidadeResult[0]?.total || 0;
    const percentualMudancaTitularidade = metaMudancaTitularidade 
      ? calcularPercentualPorMeta(totalMudancaTitularidade, metaMudancaTitularidade)
      : 0;

    // Migração de tecnologia
    const metaMigracaoTecnologia = await db_get(`
      SELECT meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'migração de tecnologia'
    `, [regionalId, periodo]);

    const migracaoTecnologiaResult = await db_all(`
      SELECT SUM(migracao_tecnologia_volume) as total
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    const totalMigracaoTecnologia = migracaoTecnologiaResult[0]?.total || 0;
    const percentualMigracaoTecnologia = metaMigracaoTecnologia 
      ? calcularPercentualPorMeta(totalMigracaoTecnologia, metaMigracaoTecnologia)
      : 0;

    // Renovação
    const metaRenovacao = await db_get(`
      SELECT meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'renovação'
    `, [regionalId, periodo]);

    const renovacaoResult = await db_all(`
      SELECT SUM(renovacao_volume) as total
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    const totalRenovacao = renovacaoResult[0]?.total || 0;
    const percentualRenovacao = metaRenovacao 
      ? calcularPercentualPorMeta(totalRenovacao, metaRenovacao)
      : 0;

    // Plano evento
    const metaPlanoEvento = await db_get(`
      SELECT meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'plano evento'
    `, [regionalId, periodo]);

    const planoEventoResult = await db_all(`
      SELECT SUM(plano_evento_volume) as total
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    const totalPlanoEvento = planoEventoResult[0]?.total || 0;
    const percentualPlanoEvento = metaPlanoEvento 
      ? calcularPercentualPorMeta(totalPlanoEvento, metaPlanoEvento)
      : 0;

    // SVA
    const metaSva = await db_get(`
      SELECT meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'sva'
    `, [regionalId, periodo]);

    const svaResult = await db_all(`
      SELECT SUM(sva_volume) as total
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    const totalSva = svaResult[0]?.total || 0;
    const percentualSva = metaSva 
      ? calcularPercentualPorMeta(totalSva, metaSva)
      : 0;

    // Telefonia
    const metaTelefonia = await db_get(`
      SELECT meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'telefonia'
    `, [regionalId, periodo]);

    const telefoniaResult = await db_all(`
      SELECT SUM(telefonia_volume) as total
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    const totalTelefonia = telefoniaResult[0]?.total || 0;
    const percentualTelefonia = metaTelefonia 
      ? calcularPercentualPorMeta(totalTelefonia, metaTelefonia)
      : 0;

    // 13) Soma dos percentuais ponderados (apenas Vendas e Churn têm peso)
    const percentualFinalPonderado = percentualVendasPonderado + percentualChurnPonderado;

    // Percentual final com incremento global
    const percentualFinalComIncremento = percentualFinalPonderado + incrementoGlobal;

    // Resposta detalhada com todos os passos
    res.json({
      regional: {
        id: regional.id,
        nome: regional.nome
      },
      periodo,
      
      // Passo 2
      qtdVendedores,
      
      // Passo 3
      incrementoGlobal,
      
      // Passo 4
      vendas: {
        realizado: totalVendasRealizado,
        detalhamento: {
          vendas: vendasData.vendas || 0
        },
        meta: metaVendas ? {
          meta1Volume: metaVendas.meta1Volume,
          meta1Percent: normalizarPercentual(metaVendas.meta1Percent),
          meta2Volume: metaVendas.meta2Volume,
          meta2Percent: normalizarPercentual(metaVendas.meta2Percent),
          meta3Volume: metaVendas.meta3Volume,
          meta3Percent: normalizarPercentual(metaVendas.meta3Percent)
        } : null,
        // Passo 5
        percentualAtingido: percentualVendas,
        // Passo 6
        peso: pesoVendas,
        // Passo 7
        percentualPonderado: percentualVendasPonderado
      },
      
      // Passo 8 e 9
      churn: {
        realizado: totalChurnRealizado,
        meta: metaChurn ? {
          meta1Volume: metaChurn.meta1Volume,
          meta1Percent: normalizarPercentual(metaChurn.meta1Percent),
          meta2Volume: metaChurn.meta2Volume,
          meta2Percent: normalizarPercentual(metaChurn.meta2Percent),
          meta3Volume: metaChurn.meta3Volume,
          meta3Percent: normalizarPercentual(metaChurn.meta3Percent)
        } : null,
        // Passo 10
        percentualAtingido: percentualChurn,
        // Passo 11
        peso: pesoChurn,
        // Passo 12
        percentualPonderado: percentualChurnPonderado
      },

      // Mudança de titularidade
      mudancaTitularidade: {
        realizado: totalMudancaTitularidade,
        meta: metaMudancaTitularidade ? {
          meta1Volume: metaMudancaTitularidade.meta1Volume,
          meta1Percent: normalizarPercentual(metaMudancaTitularidade.meta1Percent),
          meta2Volume: metaMudancaTitularidade.meta2Volume,
          meta2Percent: normalizarPercentual(metaMudancaTitularidade.meta2Percent),
          meta3Volume: metaMudancaTitularidade.meta3Volume,
          meta3Percent: normalizarPercentual(metaMudancaTitularidade.meta3Percent)
        } : null,
        percentualAtingido: percentualMudancaTitularidade
      },

      // Migração de tecnologia
      migracaoTecnologia: {
        realizado: totalMigracaoTecnologia,
        meta: metaMigracaoTecnologia ? {
          meta1Volume: metaMigracaoTecnologia.meta1Volume,
          meta1Percent: normalizarPercentual(metaMigracaoTecnologia.meta1Percent),
          meta2Volume: metaMigracaoTecnologia.meta2Volume,
          meta2Percent: normalizarPercentual(metaMigracaoTecnologia.meta2Percent),
          meta3Volume: metaMigracaoTecnologia.meta3Volume,
          meta3Percent: normalizarPercentual(metaMigracaoTecnologia.meta3Percent)
        } : null,
        percentualAtingido: percentualMigracaoTecnologia
      },

      // Renovação
      renovacao: {
        realizado: totalRenovacao,
        meta: metaRenovacao ? {
          meta1Volume: metaRenovacao.meta1Volume,
          meta1Percent: normalizarPercentual(metaRenovacao.meta1Percent),
          meta2Volume: metaRenovacao.meta2Volume,
          meta2Percent: normalizarPercentual(metaRenovacao.meta2Percent),
          meta3Volume: metaRenovacao.meta3Volume,
          meta3Percent: normalizarPercentual(metaRenovacao.meta3Percent)
        } : null,
        percentualAtingido: percentualRenovacao
      },

      // Plano evento
      planoEvento: {
        realizado: totalPlanoEvento,
        meta: metaPlanoEvento ? {
          meta1Volume: metaPlanoEvento.meta1Volume,
          meta1Percent: normalizarPercentual(metaPlanoEvento.meta1Percent),
          meta2Volume: metaPlanoEvento.meta2Volume,
          meta2Percent: normalizarPercentual(metaPlanoEvento.meta2Percent),
          meta3Volume: metaPlanoEvento.meta3Volume,
          meta3Percent: normalizarPercentual(metaPlanoEvento.meta3Percent)
        } : null,
        percentualAtingido: percentualPlanoEvento
      },

      // SVA
      sva: {
        realizado: totalSva,
        meta: metaSva ? {
          meta1Volume: metaSva.meta1Volume,
          meta1Percent: normalizarPercentual(metaSva.meta1Percent),
          meta2Volume: metaSva.meta2Volume,
          meta2Percent: normalizarPercentual(metaSva.meta2Percent),
          meta3Volume: metaSva.meta3Volume,
          meta3Percent: normalizarPercentual(metaSva.meta3Percent)
        } : null,
        percentualAtingido: percentualSva
      },

      // Telefonia
      telefonia: {
        realizado: totalTelefonia,
        meta: metaTelefonia ? {
          meta1Volume: metaTelefonia.meta1Volume,
          meta1Percent: normalizarPercentual(metaTelefonia.meta1Percent),
          meta2Volume: metaTelefonia.meta2Volume,
          meta2Percent: normalizarPercentual(metaTelefonia.meta2Percent),
          meta3Volume: metaTelefonia.meta3Volume,
          meta3Percent: normalizarPercentual(metaTelefonia.meta3Percent)
        } : null,
        percentualAtingido: percentualTelefonia
      },
      
      // Passo 13
      calculo: {
        percentualFinalPonderado, // Soma dos ponderados
        incrementoGlobal,
        percentualFinalComIncremento // Com incremento global
      }
    });

  } catch (erro) {
    console.error('Erro ao calcular comissionamento:', erro);
    res.status(500).json({ erro: 'Erro ao calcular comissionamento' });
  }
};

/**
 * Endpoint: GET /api/comissionamento/vendedores?periodo=Jan/25&regionalId=uuid
 * Retorna dados individuais de cada vendedor da regional no período
 */
exports.listarVendedores = async (req, res) => {
  try {
    const { periodo, regionalId } = req.query;

    console.log('🔍 [listarVendedores] Params recebidos:', { periodo, regionalId });

    if (!periodo || !regionalId) {
      return res.status(400).json({ 
        erro: 'Período e regionalId são obrigatórios' 
      });
    }

    // Buscar regras de comissão para vendas (meta individual)
    console.log('🔎 [listarVendedores] Buscando metaVendas');
    console.log('   regionalId:', regionalId);
    console.log('   periodo:', periodo);
    const metaVendas = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal,
        pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'vendas'
      LIMIT 1
    `, [regionalId, periodo]);

    console.log('📊 [listarVendedores] Meta vendas resultado:', JSON.stringify(metaVendas, null, 2));

    if (!metaVendas) {
      return res.status(404).json({ 
        erro: 'Nenhuma regra de comissão encontrada para vendas nesta regional e período' 
      });
    }

    // ===== CALCULAR SOMA DOS PERCENTUAIS PONDERADOS EM TEMPO REAL =====
    
    // Buscar regra de churn
    const metaChurn = await db_get(`
      SELECT 
        meta1Volume, meta1Percent,
        meta2Volume, meta2Percent,
        meta3Volume, meta3Percent
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'churn'
      LIMIT 1
    `, [regionalId, periodo]);
    
    console.log('🔧 [listarVendedores] metaChurn recuperada:', metaChurn ? 'SIM' : 'NÃO', metaChurn);

    // Buscar realizado de vendas
    const vendasData = await db_get(`
      SELECT SUM(vendas_volume) as totalVendasVolume
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    const totalVendasRealizado = vendasData?.totalVendasVolume || 0;

    // Calcular percentual de vendas (usando meta1Percent, meta2Percent, meta3Percent)
    const percentualVendas = metaVendas 
      ? calcularPercentualPorMeta(totalVendasRealizado, {
          meta1Volume: metaVendas.meta1Volume,
          meta1Percent: metaVendas.meta1Percent || 0,
          meta2Volume: metaVendas.meta2Volume,
          meta2Percent: metaVendas.meta2Percent || 0,
          meta3Volume: metaVendas.meta3Volume,
          meta3Percent: metaVendas.meta3Percent || 0
        })
      : 0;

    // Buscar realizado de churn
    const churnData = await db_get(`
      SELECT churn
      FROM churn_regionais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    const totalChurnRealizado = churnData?.churn || 0;

    // Calcular percentual de churn
    const percentualChurn = metaChurn
      ? calcularPercentualPorMeta(totalChurnRealizado, {
          meta1Volume: metaChurn.meta1Volume,
          meta1Percent: metaChurn.meta1Percent || 0,
          meta2Volume: metaChurn.meta2Volume,
          meta2Percent: metaChurn.meta2Percent || 0,
          meta3Volume: metaChurn.meta3Volume,
          meta3Percent: metaChurn.meta3Percent || 0
        }, true)
      : 0;

    // Calcular pesos
    const pesoVendasChurn = normalizarPeso(metaVendas?.pesoVendasChurn, 0.5);
    const pesoVendas = pesoVendasChurn;
    const pesoChurn = 1 - pesoVendasChurn;

    // Calcular percentuais ponderados
    const percentualVendasPonderado = percentualVendas * pesoVendas;
    const percentualChurnPonderado = percentualChurn * pesoChurn;

    // Soma dos percentuais ponderados
    const somaPercentuaisPonderados = percentualVendasPonderado + percentualChurnPonderado;

    console.log('📈 [listarVendedores] Cálculo de soma percentuais ponderados:');
    console.log(`   Vendas realizado: ${totalVendasRealizado} | Percentual: ${(percentualVendas * 100).toFixed(2)}% | Ponderado: ${(percentualVendasPonderado * 100).toFixed(2)}%`);
    console.log(`   Churn realizado: ${totalChurnRealizado} | Percentual: ${(percentualChurn * 100).toFixed(2)}% | Ponderado: ${(percentualChurnPonderado * 100).toFixed(2)}%`);
    console.log(`   SOMA DOS PERCENTUAIS PONDERADOS: ${(somaPercentuaisPonderados * 100).toFixed(2)}%`);

    // ===== BUSCAR METAS PARA OUTROS TIPOS DE MÉTRICAS =====
    
    const metaMudancaTitularidade = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'mudança de titularidade'
    `, [regionalId, periodo]);

    const metaMigracaoTecnologia = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'migração de tecnologia'
    `, [regionalId, periodo]);

    const metaRenovacao = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'renovação'
    `, [regionalId, periodo]);

    const metaPlanoEvento = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'plano evento'
    `, [regionalId, periodo]);

    const metaSva = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'sva'
    `, [regionalId, periodo]);

    const metaTelefonia = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'telefonia'
    `, [regionalId, periodo]);

    // ===== CALCULAR PERCENTUAL DE RESUMO PARA CADA MÉTRICA =====
    
    // Mudança de Titularidade
    const mudancaTitularidadeData = await db_get(`
      SELECT SUM(mudanca_titularidade_volume) as totalVolume
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    const totalMudancaTitularidade = mudancaTitularidadeData?.totalVolume || 0;
    const percentualMudancaTitularidadeResumo = metaMudancaTitularidade 
      ? calcularPercentualPorMeta(totalMudancaTitularidade, {
          meta1Volume: metaMudancaTitularidade.meta1Volume,
          meta1Percent: metaMudancaTitularidade.meta1Percent || 0,
          meta2Volume: metaMudancaTitularidade.meta2Volume,
          meta2Percent: metaMudancaTitularidade.meta2Percent || 0,
          meta3Volume: metaMudancaTitularidade.meta3Volume,
          meta3Percent: metaMudancaTitularidade.meta3Percent || 0
        })
      : 0;

    // Migração de Tecnologia
    const migracaoTecnologiaData = await db_get(`
      SELECT SUM(migracao_tecnologia_volume) as totalVolume
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    const totalMigracaoTecnologia = migracaoTecnologiaData?.totalVolume || 0;
    const percentualMigracaoTecnologiaResumo = metaMigracaoTecnologia 
      ? calcularPercentualPorMeta(totalMigracaoTecnologia, {
          meta1Volume: metaMigracaoTecnologia.meta1Volume,
          meta1Percent: metaMigracaoTecnologia.meta1Percent || 0,
          meta2Volume: metaMigracaoTecnologia.meta2Volume,
          meta2Percent: metaMigracaoTecnologia.meta2Percent || 0,
          meta3Volume: metaMigracaoTecnologia.meta3Volume,
          meta3Percent: metaMigracaoTecnologia.meta3Percent || 0
        })
      : 0;

    // Renovação
    const renovacaoData = await db_get(`
      SELECT SUM(renovacao_volume) as totalVolume
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    const totalRenovacao = renovacaoData?.totalVolume || 0;
    const percentualRenovacaoResumo = metaRenovacao 
      ? calcularPercentualPorMeta(totalRenovacao, {
          meta1Volume: metaRenovacao.meta1Volume,
          meta1Percent: metaRenovacao.meta1Percent || 0,
          meta2Volume: metaRenovacao.meta2Volume,
          meta2Percent: metaRenovacao.meta2Percent || 0,
          meta3Volume: metaRenovacao.meta3Volume,
          meta3Percent: metaRenovacao.meta3Percent || 0
        })
      : 0;

    // Plano Evento
    const planoEventoData = await db_get(`
      SELECT SUM(plano_evento_volume) as totalVolume
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    const totalPlanoEvento = planoEventoData?.totalVolume || 0;
    const percentualPlanoEventoResumo = metaPlanoEvento 
      ? calcularPercentualPorMeta(totalPlanoEvento, {
          meta1Volume: metaPlanoEvento.meta1Volume,
          meta1Percent: metaPlanoEvento.meta1Percent || 0,
          meta2Volume: metaPlanoEvento.meta2Volume,
          meta2Percent: metaPlanoEvento.meta2Percent || 0,
          meta3Volume: metaPlanoEvento.meta3Volume,
          meta3Percent: metaPlanoEvento.meta3Percent || 0
        })
      : 0;

    // SVA
    const svaData = await db_get(`
      SELECT SUM(sva_volume) as totalVolume
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    const totalSva = svaData?.totalVolume || 0;
    const percentualSvaResumo = metaSva 
      ? calcularPercentualPorMeta(totalSva, {
          meta1Volume: metaSva.meta1Volume,
          meta1Percent: metaSva.meta1Percent || 0,
          meta2Volume: metaSva.meta2Volume,
          meta2Percent: metaSva.meta2Percent || 0,
          meta3Volume: metaSva.meta3Volume,
          meta3Percent: metaSva.meta3Percent || 0
        })
      : 0;

    // Telefonia
    const telefoniaData = await db_get(`
      SELECT SUM(telefonia_volume) as totalVolume
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    const totalTelefonia = telefoniaData?.totalVolume || 0;
    const percentualTelefoniaResumo = metaTelefonia 
      ? calcularPercentualPorMeta(totalTelefonia, {
          meta1Volume: metaTelefonia.meta1Volume,
          meta1Percent: metaTelefonia.meta1Percent || 0,
          meta2Volume: metaTelefonia.meta2Volume,
          meta2Percent: metaTelefonia.meta2Percent || 0,
          meta3Volume: metaTelefonia.meta3Volume,
          meta3Percent: metaTelefonia.meta3Percent || 0
        })
      : 0;

    // Buscar todos os vendedores ativos da regional
    const vendedores = await db_all(`
      SELECT 
        c.id,
        c.nome,
        c.cpf
      FROM colaboradores c
      WHERE c.regional_id = ? AND c.status = 'ativo'
      ORDER BY c.nome
    `, [regionalId]);

    console.log('👥 [listarVendedores] Vendedores encontrados:', vendedores.length);

    // Calcular metas individuais por vendedor (mesma logica do relatorio de metas)
    const totalVendedores = vendedores.length || 0;
    
    // VENDAS - Meta Individual
    const incrementoGlobal = normalizarPercentual(metaVendas.incrementoGlobal || 0);
    const meta1Volume = normalizarNumero(metaVendas.meta1Volume);
    const meta2Volume = normalizarNumero(metaVendas.meta2Volume);
    const meta3Volume = normalizarNumero(metaVendas.meta3Volume);
    const metaIndividual1 = totalVendedores > 0 && !Number.isNaN(meta1Volume)
      ? (meta1Volume / totalVendedores) * (1 + incrementoGlobal)
      : 0;
    const metaIndividual2 = totalVendedores > 0 && !Number.isNaN(meta2Volume)
      ? (meta2Volume / totalVendedores) * (1 + incrementoGlobal)
      : 0;
    const metaIndividual3 = totalVendedores > 0 && !Number.isNaN(meta3Volume)
      ? (meta3Volume / totalVendedores) * (1 + incrementoGlobal)
      : 0;

    // MUDANÇA DE TITULARIDADE - Meta Individual
    const incrementoGlobalMudanca = normalizarPercentual(metaMudancaTitularidade?.incrementoGlobal || 0);
    const meta1VolumeMudanca = normalizarNumero(metaMudancaTitularidade?.meta1Volume || 0);
    const meta2VolumeMudanca = normalizarNumero(metaMudancaTitularidade?.meta2Volume || 0);
    const meta3VolumeMudanca = normalizarNumero(metaMudancaTitularidade?.meta3Volume || 0);
    const metaIndividualMudanca1 = totalVendedores > 0 && !Number.isNaN(meta1VolumeMudanca)
      ? (meta1VolumeMudanca / totalVendedores) * (1 + incrementoGlobalMudanca)
      : 0;
    const metaIndividualMudanca2 = totalVendedores > 0 && !Number.isNaN(meta2VolumeMudanca)
      ? (meta2VolumeMudanca / totalVendedores) * (1 + incrementoGlobalMudanca)
      : 0;
    const metaIndividualMudanca3 = totalVendedores > 0 && !Number.isNaN(meta3VolumeMudanca)
      ? (meta3VolumeMudanca / totalVendedores) * (1 + incrementoGlobalMudanca)
      : 0;

    // MIGRAÇÃO DE TECNOLOGIA - Meta Individual
    const incrementoGlobalMigracao = normalizarPercentual(metaMigracaoTecnologia?.incrementoGlobal || 0);
    const meta1VolumeMigracao = normalizarNumero(metaMigracaoTecnologia?.meta1Volume || 0);
    const meta2VolumeMigracao = normalizarNumero(metaMigracaoTecnologia?.meta2Volume || 0);
    const meta3VolumeMigracao = normalizarNumero(metaMigracaoTecnologia?.meta3Volume || 0);
    const metaIndividualMigracao1 = totalVendedores > 0 && !Number.isNaN(meta1VolumeMigracao)
      ? (meta1VolumeMigracao / totalVendedores) * (1 + incrementoGlobalMigracao)
      : 0;
    const metaIndividualMigracao2 = totalVendedores > 0 && !Number.isNaN(meta2VolumeMigracao)
      ? (meta2VolumeMigracao / totalVendedores) * (1 + incrementoGlobalMigracao)
      : 0;
    const metaIndividualMigracao3 = totalVendedores > 0 && !Number.isNaN(meta3VolumeMigracao)
      ? (meta3VolumeMigracao / totalVendedores) * (1 + incrementoGlobalMigracao)
      : 0;

    // RENOVAÇÃO - Meta Individual
    const incrementoGlobalRenovacao = normalizarPercentual(metaRenovacao?.incrementoGlobal || 0);
    const meta1VolumeRenovacao = normalizarNumero(metaRenovacao?.meta1Volume || 0);
    const meta2VolumeRenovacao = normalizarNumero(metaRenovacao?.meta2Volume || 0);
    const meta3VolumeRenovacao = normalizarNumero(metaRenovacao?.meta3Volume || 0);
    const metaIndividualRenovacao1 = totalVendedores > 0 && !Number.isNaN(meta1VolumeRenovacao)
      ? (meta1VolumeRenovacao / totalVendedores) * (1 + incrementoGlobalRenovacao)
      : 0;
    const metaIndividualRenovacao2 = totalVendedores > 0 && !Number.isNaN(meta2VolumeRenovacao)
      ? (meta2VolumeRenovacao / totalVendedores) * (1 + incrementoGlobalRenovacao)
      : 0;
    const metaIndividualRenovacao3 = totalVendedores > 0 && !Number.isNaN(meta3VolumeRenovacao)
      ? (meta3VolumeRenovacao / totalVendedores) * (1 + incrementoGlobalRenovacao)
      : 0;

    // PLANO EVENTO - Meta Individual
    const incrementoGlobalPlanoEvento = normalizarPercentual(metaPlanoEvento?.incrementoGlobal || 0);
    const meta1VolumePlanoEvento = normalizarNumero(metaPlanoEvento?.meta1Volume || 0);
    const meta2VolumePlanoEvento = normalizarNumero(metaPlanoEvento?.meta2Volume || 0);
    const meta3VolumePlanoEvento = normalizarNumero(metaPlanoEvento?.meta3Volume || 0);
    const metaIndividualPlanoEvento1 = totalVendedores > 0 && !Number.isNaN(meta1VolumePlanoEvento)
      ? (meta1VolumePlanoEvento / totalVendedores) * (1 + incrementoGlobalPlanoEvento)
      : 0;
    const metaIndividualPlanoEvento2 = totalVendedores > 0 && !Number.isNaN(meta2VolumePlanoEvento)
      ? (meta2VolumePlanoEvento / totalVendedores) * (1 + incrementoGlobalPlanoEvento)
      : 0;
    const metaIndividualPlanoEvento3 = totalVendedores > 0 && !Number.isNaN(meta3VolumePlanoEvento)
      ? (meta3VolumePlanoEvento / totalVendedores) * (1 + incrementoGlobalPlanoEvento)
      : 0;

    // SVA - Meta Individual
    const incrementoGlobalSva = normalizarPercentual(metaSva?.incrementoGlobal || 0);
    const meta1VolumeSva = normalizarNumero(metaSva?.meta1Volume || 0);
    const meta2VolumeSva = normalizarNumero(metaSva?.meta2Volume || 0);
    const meta3VolumeSva = normalizarNumero(metaSva?.meta3Volume || 0);
    const metaIndividualSva1 = totalVendedores > 0 && !Number.isNaN(meta1VolumeSva)
      ? (meta1VolumeSva / totalVendedores) * (1 + incrementoGlobalSva)
      : 0;
    const metaIndividualSva2 = totalVendedores > 0 && !Number.isNaN(meta2VolumeSva)
      ? (meta2VolumeSva / totalVendedores) * (1 + incrementoGlobalSva)
      : 0;
    const metaIndividualSva3 = totalVendedores > 0 && !Number.isNaN(meta3VolumeSva)
      ? (meta3VolumeSva / totalVendedores) * (1 + incrementoGlobalSva)
      : 0;

    // TELEFONIA - Meta Individual
    const incrementoGlobalTelefonia = normalizarPercentual(metaTelefonia?.incrementoGlobal || 0);
    const meta1VolumeTelefonia = normalizarNumero(metaTelefonia?.meta1Volume || 0);
    const meta2VolumeTelefonia = normalizarNumero(metaTelefonia?.meta2Volume || 0);
    const meta3VolumeTelefonia = normalizarNumero(metaTelefonia?.meta3Volume || 0);
    const metaIndividualTelefonia1 = totalVendedores > 0 && !Number.isNaN(meta1VolumeTelefonia)
      ? (meta1VolumeTelefonia / totalVendedores) * (1 + incrementoGlobalTelefonia)
      : 0;
    const metaIndividualTelefonia2 = totalVendedores > 0 && !Number.isNaN(meta2VolumeTelefonia)
      ? (meta2VolumeTelefonia / totalVendedores) * (1 + incrementoGlobalTelefonia)
      : 0;
    const metaIndividualTelefonia3 = totalVendedores > 0 && !Number.isNaN(meta3VolumeTelefonia)
      ? (meta3VolumeTelefonia / totalVendedores) * (1 + incrementoGlobalTelefonia)
      : 0;

    // Para cada vendedor, buscar suas vendas e calcular percentual e comissão
    const vendedoresComDados = [];

    // Função para calcular comissão (definida fora do loop)
    // Fórmula: (VALOR TOTAL × % ATINGIDO no RESUMO **específico** da métrica) + (VALOR TOTAL × % ALCANÇADO individual)
    const calcularComissaoTipo = (valorFinanceiro, percentualResumoTipo, percentualAlcancadoTipo) => {
      if (!valorFinanceiro || valorFinanceiro === 0) return 0;
      return (valorFinanceiro * percentualResumoTipo) + 
             (valorFinanceiro * percentualAlcancadoTipo);
    };

    for (const vendedor of vendedores) {
      // Buscar vendas do vendedor no período
      const vendasVendedor = await db_get(`
        SELECT 
          vendas_volume,
          vendas_financeiro,
          mudanca_titularidade_volume,
          mudanca_titularidade_financeiro,
          migracao_tecnologia_volume,
          migracao_tecnologia_financeiro,
          renovacao_volume,
          renovacao_financeiro,
          plano_evento_volume,
          plano_evento_financeiro,
          sva_volume,
          sva_financeiro,
          telefonia_volume,
          telefonia_financeiro
        FROM vendas_mensais
        WHERE vendedor_id = ? AND regional_id = ? AND periodo = ?
      `, [vendedor.id, regionalId, periodo]);

      // Se não houver vendas, criar objeto vazio
      const vendas = vendasVendedor || {
        vendas_volume: 0,
        vendas_financeiro: 0,
        mudanca_titularidade_volume: 0,
        mudanca_titularidade_financeiro: 0,
        migracao_tecnologia_volume: 0,
        migracao_tecnologia_financeiro: 0,
        renovacao_volume: 0,
        renovacao_financeiro: 0,
        plano_evento_volume: 0,
        plano_evento_financeiro: 0,
        sva_volume: 0,
        sva_financeiro: 0,
        telefonia_volume: 0,
        telefonia_financeiro: 0
      };

      // Calcular percentual alcançado na meta individual de vendas
      const volumeVendas = vendas.vendas_volume || 0;
      let percentualAlcancado = 0;

      // Mesma lógica de calcular percentual (quanto maior, melhor)
      const meta1PercentIndividual = normalizarPercentual(metaVendas.meta1PercentIndividual);
      const meta2PercentIndividual = normalizarPercentual(metaVendas.meta2PercentIndividual);
      const meta3PercentIndividual = normalizarPercentual(metaVendas.meta3PercentIndividual);

      if (volumeVendas >= metaIndividual3) {
        // Se atingiu meta3 (menor), aplicar meta3Percent
        if (volumeVendas >= metaIndividual2) {
          // Se atingiu meta2 (média), aplicar meta2Percent
          if (volumeVendas >= metaIndividual1) {
            // Se atingiu meta1 (maior), aplicar meta1Percent
            percentualAlcancado = meta1PercentIndividual;
          } else {
            percentualAlcancado = meta2PercentIndividual;
          }
        } else {
          percentualAlcancado = meta3PercentIndividual;
        }
      }

      // Calcular percentual alcançado na meta individual de MUDANÇA DE TITULARIDADE
      const volumeMudancaTitularidade = vendas.mudanca_titularidade_volume || 0;
      let percentualMudancaTitularidadeVendedor = 0;

      if (metaMudancaTitularidade) {
        const meta1PercentIndividualMudanca = normalizarPercentual(metaMudancaTitularidade.meta1PercentIndividual || 0);
        const meta2PercentIndividualMudanca = normalizarPercentual(metaMudancaTitularidade.meta2PercentIndividual || 0);
        const meta3PercentIndividualMudanca = normalizarPercentual(metaMudancaTitularidade.meta3PercentIndividual || 0);

        if (volumeMudancaTitularidade >= metaIndividualMudanca1) {
          // Atingiu Meta1 (maior)
          percentualMudancaTitularidadeVendedor = meta1PercentIndividualMudanca;
        } else if (volumeMudancaTitularidade >= metaIndividualMudanca2) {
          // Atingiu Meta2 (média)
          percentualMudancaTitularidadeVendedor = meta2PercentIndividualMudanca;
        } else if (volumeMudancaTitularidade >= metaIndividualMudanca3) {
          // Atingiu Meta3 (mínima)
          percentualMudancaTitularidadeVendedor = meta3PercentIndividualMudanca;
        } else {
          // Não atingiu nenhuma meta
          percentualMudancaTitularidadeVendedor = 0;
        }
      }

      // Calcular percentual alcançado na meta individual de MIGRAÇÃO DE TECNOLOGIA
      const volumeMigracaoTecnologia = vendas.migracao_tecnologia_volume || 0;
      let percentualMigracaoTecnologiaVendedor = 0;

      if (metaMigracaoTecnologia) {
        const meta1PercentIndividualMigracao = normalizarPercentual(metaMigracaoTecnologia.meta1PercentIndividual || 0);
        const meta2PercentIndividualMigracao = normalizarPercentual(metaMigracaoTecnologia.meta2PercentIndividual || 0);
        const meta3PercentIndividualMigracao = normalizarPercentual(metaMigracaoTecnologia.meta3PercentIndividual || 0);

        if (volumeMigracaoTecnologia >= metaIndividualMigracao1) {
          percentualMigracaoTecnologiaVendedor = meta1PercentIndividualMigracao;
        } else if (volumeMigracaoTecnologia >= metaIndividualMigracao2) {
          percentualMigracaoTecnologiaVendedor = meta2PercentIndividualMigracao;
        } else if (volumeMigracaoTecnologia >= metaIndividualMigracao3) {
          percentualMigracaoTecnologiaVendedor = meta3PercentIndividualMigracao;
        }
      }

      // Calcular percentual alcançado na meta individual de RENOVAÇÃO
      const volumeRenovacao = vendas.renovacao_volume || 0;
      let percentualRenovacaoVendedor = 0;

      if (metaRenovacao) {
        const meta1PercentIndividualRenovacao = normalizarPercentual(metaRenovacao.meta1PercentIndividual || 0);
        const meta2PercentIndividualRenovacao = normalizarPercentual(metaRenovacao.meta2PercentIndividual || 0);
        const meta3PercentIndividualRenovacao = normalizarPercentual(metaRenovacao.meta3PercentIndividual || 0);

        if (volumeRenovacao >= metaIndividualRenovacao1) {
          percentualRenovacaoVendedor = meta1PercentIndividualRenovacao;
        } else if (volumeRenovacao >= metaIndividualRenovacao2) {
          percentualRenovacaoVendedor = meta2PercentIndividualRenovacao;
        } else if (volumeRenovacao >= metaIndividualRenovacao3) {
          percentualRenovacaoVendedor = meta3PercentIndividualRenovacao;
        }
      }

      // Calcular percentual alcançado na meta individual de PLANO EVENTO
      const volumePlanoEvento = vendas.plano_evento_volume || 0;
      let percentualPlanoEventoVendedor = 0;

      if (metaPlanoEvento) {
        const meta1PercentIndividualPlanoEvento = normalizarPercentual(metaPlanoEvento.meta1PercentIndividual || 0);
        const meta2PercentIndividualPlanoEvento = normalizarPercentual(metaPlanoEvento.meta2PercentIndividual || 0);
        const meta3PercentIndividualPlanoEvento = normalizarPercentual(metaPlanoEvento.meta3PercentIndividual || 0);

        if (volumePlanoEvento >= metaIndividualPlanoEvento1) {
          percentualPlanoEventoVendedor = meta1PercentIndividualPlanoEvento;
        } else if (volumePlanoEvento >= metaIndividualPlanoEvento2) {
          percentualPlanoEventoVendedor = meta2PercentIndividualPlanoEvento;
        } else if (volumePlanoEvento >= metaIndividualPlanoEvento3) {
          percentualPlanoEventoVendedor = meta3PercentIndividualPlanoEvento;
        }
      }

      // Calcular percentual alcançado na meta individual de SVA
      const volumeSva = vendas.sva_volume || 0;
      let percentualSvaVendedor = 0;

      if (metaSva) {
        const meta1PercentIndividualSva = normalizarPercentual(metaSva.meta1PercentIndividual || 0);
        const meta2PercentIndividualSva = normalizarPercentual(metaSva.meta2PercentIndividual || 0);
        const meta3PercentIndividualSva = normalizarPercentual(metaSva.meta3PercentIndividual || 0);

        if (volumeSva >= metaIndividualSva1) {
          percentualSvaVendedor = meta1PercentIndividualSva;
        } else if (volumeSva >= metaIndividualSva2) {
          percentualSvaVendedor = meta2PercentIndividualSva;
        } else if (volumeSva >= metaIndividualSva3) {
          percentualSvaVendedor = meta3PercentIndividualSva;
        }
      }

      // Calcular percentual alcançado na meta individual de TELEFONIA
      const volumeTelefonia = vendas.telefonia_volume || 0;
      let percentualTelefoniaVendedor = 0;

      if (metaTelefonia) {
        const meta1PercentIndividualTelefonia = normalizarPercentual(metaTelefonia.meta1PercentIndividual || 0);
        const meta2PercentIndividualTelefonia = normalizarPercentual(metaTelefonia.meta2PercentIndividual || 0);
        const meta3PercentIndividualTelefonia = normalizarPercentual(metaTelefonia.meta3PercentIndividual || 0);

        if (volumeTelefonia >= metaIndividualTelefonia1) {
          percentualTelefoniaVendedor = meta1PercentIndividualTelefonia;
        } else if (volumeTelefonia >= metaIndividualTelefonia2) {
          percentualTelefoniaVendedor = meta2PercentIndividualTelefonia;
        } else if (volumeTelefonia >= metaIndividualTelefonia3) {
          percentualTelefoniaVendedor = meta3PercentIndividualTelefonia;
        }
      }

      vendedoresComDados.push({
        id: vendedor.id,
        nome: vendedor.nome,
        cpf: vendedor.cpf,
        vendas: {
          quantidade: vendas.vendas_volume || 0,
          valorTotal: vendas.vendas_financeiro || 0,
          percentualAlcancado,
          comissao: calcularComissaoTipo(vendas.vendas_financeiro || 0, somaPercentuaisPonderados, percentualAlcancado)
        },
        mudancaTitularidade: {
          quantidade: vendas.mudanca_titularidade_volume || 0,
          valorTotal: vendas.mudanca_titularidade_financeiro || 0,
          percentualAlcancado: percentualMudancaTitularidadeVendedor,
          comissao: calcularComissaoTipo(vendas.mudanca_titularidade_financeiro || 0, percentualMudancaTitularidadeResumo, percentualMudancaTitularidadeVendedor)
        },
        migracaoTecnologia: {
          quantidade: vendas.migracao_tecnologia_volume || 0,
          valorTotal: vendas.migracao_tecnologia_financeiro || 0,
          percentualAlcancado: percentualMigracaoTecnologiaVendedor,
          comissao: calcularComissaoTipo(vendas.migracao_tecnologia_financeiro || 0, percentualMigracaoTecnologiaResumo, percentualMigracaoTecnologiaVendedor)
        },
        renovacao: {
          quantidade: vendas.renovacao_volume || 0,
          valorTotal: vendas.renovacao_financeiro || 0,
          percentualAlcancado: percentualRenovacaoVendedor,
          comissao: calcularComissaoTipo(vendas.renovacao_financeiro || 0, percentualRenovacaoResumo, percentualRenovacaoVendedor)
        },
        planoEvento: {
          quantidade: vendas.plano_evento_volume || 0,
          valorTotal: vendas.plano_evento_financeiro || 0,
          percentualAlcancado: percentualPlanoEventoVendedor,
          comissao: calcularComissaoTipo(vendas.plano_evento_financeiro || 0, percentualPlanoEventoResumo, percentualPlanoEventoVendedor)
        },
        sva: {
          quantidade: vendas.sva_volume || 0,
          valorTotal: vendas.sva_financeiro || 0,
          percentualAlcancado: percentualSvaVendedor,
          comissao: calcularComissaoTipo(vendas.sva_financeiro || 0, percentualSvaResumo, percentualSvaVendedor)
        },
        telefonia: {
          quantidade: vendas.telefonia_volume || 0,
          valorTotal: vendas.telefonia_financeiro || 0,
          percentualAlcancado: percentualTelefoniaVendedor,
          comissao: calcularComissaoTipo(vendas.telefonia_financeiro || 0, percentualTelefoniaResumo, percentualTelefoniaVendedor)
        }
      });
    }

    console.log('✅ [listarVendedores] Retornando:', vendedoresComDados.length, 'vendedores');

    res.json({
      periodo,
      regionalId,
      somaPercentuaisPonderados,
      vendedores: vendedoresComDados
    });

  } catch (erro) {
    console.error('❌ [listarVendedores] Erro ao listar vendedores:', erro);
    console.error('Stack trace:', erro.stack);
    res.status(500).json({ 
      erro: 'Erro ao listar vendedores',
      detalhes: erro.message 
    });
  }
};

/**
 * Lista consolidado de comissionamento de todas as regionais no período
 * GET /api/comissionamento/consolidado?periodo=Jan/25
 */
exports.listarConsolidado = async (req, res) => {
  try {
    const { periodo } = req.query;

    console.log('🔍 [listarConsolidado] Params recebidos:', { periodo });

    if (!periodo) {
      return res.status(400).json({ 
        erro: 'Período é obrigatório' 
      });
    }

    // Buscar todas as regionais
    const regionais = await db_all(`SELECT id, nome FROM regionais ORDER BY nome`);
    
    if (!regionais || regionais.length === 0) {
      return res.json({
        periodo,
        linhas: []
      });
    }

    console.log('🌍 [listarConsolidado] Regionais encontradas:', regionais.length);

    const resultado = [];

    // Para cada regional, buscar vendedores e comissões
    for (const regional of regionais) {
      const regionalId = regional.id;
      const regionalNome = regional.nome;

      // Buscar vendedores ativos da regional
      const vendedores = await db_all(`
        SELECT 
          c.id,
          c.nome,
          c.cpf
        FROM colaboradores c
        WHERE c.regional_id = ? AND c.status = 'ativo'
        ORDER BY c.nome
      `, [regionalId]);

      if (!vendedores || vendedores.length === 0) {
        continue; // Pula regional sem vendedores
      }

      // Para cada vendedor, buscar valores reais
      for (const vendedor of vendedores) {
        const vendedorId = vendedor.id;

        // Buscar valores de vendas do vendedor na tabela vendas_mensais
        const vendas = await db_get(`
          SELECT 
            COALESCE(vendas_volume, 0) AS vendas_valor,
            0 AS churn_valor,
            COALESCE(mudanca_titularidade_volume, 0) AS mudanca_titularidade_valor,
            COALESCE(migracao_tecnologia_volume, 0) AS migracao_tecnologia_valor,
            COALESCE(renovacao_volume, 0) AS renovacao_valor,
            COALESCE(plano_evento_volume, 0) AS plano_evento_valor,
            COALESCE(sva_volume, 0) AS sva_valor,
            COALESCE(telefonia_financeiro, 0) AS telefonia_financeiro
          FROM vendas_mensais
          WHERE vendedor_id = ? AND periodo = ?
        `, [vendedorId, periodo]);

        // Buscar regras de comissão de cada tipo para esta regional
        const regrasVendas = await db_get(`
          SELECT * FROM regras_comissao
          WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'vendas'
        `, [regionalId, periodo]);

        const regrasChurn = await db_get(`
          SELECT * FROM regras_comissao
          WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'churn'
        `, [regionalId, periodo]);

        const regrasMudanca = await db_get(`
          SELECT * FROM regras_comissao
          WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'mudança de titularidade'
        `, [regionalId, periodo]);

        const regrasMigracao = await db_get(`
          SELECT * FROM regras_comissao
          WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'migração de tecnologia'
        `, [regionalId, periodo]);

        const regrasRenovacao = await db_get(`
          SELECT * FROM regras_comissao
          WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'renovação'
        `, [regionalId, periodo]);

        const regrasPlanoEvento = await db_get(`
          SELECT * FROM regras_comissao
          WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'plano evento'
        `, [regionalId, periodo]);

        const regrasSVA = await db_get(`
          SELECT * FROM regras_comissao
          WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'sva'
        `, [regionalId, periodo]);

        const regrasTelefonia = await db_get(`
          SELECT * FROM regras_comissao
          WHERE regionalId = ? AND periodo = ? AND LOWER(tipoMeta) = 'telefonia'
        `, [regionalId, periodo]);

        // Calcular total de vendedores ativos para metas individuais
        const totalVendedores = vendedores.length;

        // Função auxiliar para calcular comissão individual
        const calcularComissaoIndividual = (valorReal, regra, totalVendedores, inverterPolaridade = false) => {
          if (!regra || !valorReal) return 0;

          const incrementoGlobal = normalizarPercentual(regra.incrementoGlobal || 0);
          const meta1Volume = normalizarNumero(regra.meta1Volume);
          const meta2Volume = normalizarNumero(regra.meta2Volume);
          const meta3Volume = normalizarNumero(regra.meta3Volume);

          // Calcular meta individual
          const metaIndividual1 = totalVendedores > 0 ? (meta1Volume / totalVendedores) * (1 + incrementoGlobal) : 0;
          const metaIndividual2 = totalVendedores > 0 ? (meta2Volume / totalVendedores) * (1 + incrementoGlobal) : 0;
          const metaIndividual3 = totalVendedores > 0 ? (meta3Volume / totalVendedores) * (1 + incrementoGlobal) : 0;

          // Calcular percentual por degrau
          const percentualAtingido = calcularPercentualPorMeta(
            valorReal,
            {
              meta1Volume: metaIndividual1,
              meta1Percent: regra.meta1PercentIndividual || regra.meta1Percent,
              meta2Volume: metaIndividual2,
              meta2Percent: regra.meta2PercentIndividual || regra.meta2Percent,
              meta3Volume: metaIndividual3,
              meta3Percent: regra.meta3PercentIndividual || regra.meta3Percent
            },
            inverterPolaridade
          );

          return valorReal * percentualAtingido;
        };

        // Calcular comissões para cada tipo
        const comissaoVendas = calcularComissaoIndividual(
          vendas?.vendas_valor || 0,
          regrasVendas,
          totalVendedores
        );

        const comissaoChurn = calcularComissaoIndividual(
          vendas?.churn_valor || 0,
          regrasChurn,
          totalVendedores,
          true // inverter polaridade para churn
        );

        const comissaoMudanca = calcularComissaoIndividual(
          vendas?.mudanca_titularidade_valor || 0,
          regrasMudanca,
          totalVendedores
        );

        const comissaoMigracao = calcularComissaoIndividual(
          vendas?.migracao_tecnologia_valor || 0,
          regrasMigracao,
          totalVendedores
        );

        const comissaoRenovacao = calcularComissaoIndividual(
          vendas?.renovacao_valor || 0,
          regrasRenovacao,
          totalVendedores
        );

        const comissaoPlanoEvento = calcularComissaoIndividual(
          vendas?.plano_evento_valor || 0,
          regrasPlanoEvento,
          totalVendedores
        );

        const comissaoSVA = calcularComissaoIndividual(
          vendas?.sva_valor || 0,
          regrasSVA,
          totalVendedores
        );

        const comissaoTelefonia = calcularComissaoIndividual(
          vendas?.telefonia_financeiro || 0,
          regrasTelefonia,
          totalVendedores
        );

        // Montar linha do resultado
        resultado.push({
          regional: regionalNome,
          vendedor: vendedor.nome,
          comissaoVendas,
          comissaoChurn,
          comissaoMudancaTitularidade: comissaoMudanca,
          comissaoMigracaoTecnologia: comissaoMigracao,
          comissaoRenovacao,
          comissaoPlanoEvento,
          comissaoSVA,
          comissaoTelefonia
        });
      }
    }

    console.log('✅ [listarConsolidado] Retornando:', resultado.length, 'linhas');

    res.json({
      periodo,
      linhas: resultado
    });

  } catch (erro) {
    console.error('❌ [listarConsolidado] Erro ao listar consolidado:', erro);
    console.error('Stack trace:', erro.stack);
    res.status(500).json({ 
      erro: 'Erro ao listar consolidado',
      detalhes: erro.message 
    });
  }
};

