const { db_get, db_all } = require('../config/database');
const ComissaoLiderancaRegra = require('../models/ComissaoLiderancaRegra');
const DEBUG_COMISSAO = process.env.DEBUG_COMISSAO === '1';
const debugLog = (...args) => {
  if (DEBUG_COMISSAO) {
    console.log(...args);
  }
};

const normalizarNumero = (valor) => {
  if (valor === null || valor === undefined) return NaN;
  return Number(String(valor).replace(',', '.'));
};

const normalizarPercentual = (valor) => {
  const numero = normalizarNumero(valor);
  if (Number.isNaN(numero)) return 0;
  return numero >= 1 ? numero / 100 : numero;
};

const normalizarPeso = (valor, padrao = 0.5) => {
  const numero = normalizarNumero(valor);
  if (Number.isNaN(numero)) return padrao;
  const normalizado = numero > 1 ? numero / 100 : numero;
  return Math.min(1, Math.max(0, normalizado));
};

const FILTRO_EXCLUIR_LIDERANCAS = `
  COALESCE(LOWER(f.nome), '') NOT LIKE '%gerente regional%'
  AND COALESCE(LOWER(f.nome), '') NOT LIKE '%gerente da matriz%'
  AND COALESCE(LOWER(f.nome), '') NOT LIKE '%gerente matriz%'
  AND COALESCE(LOWER(f.nome), '') NOT LIKE '%supervisor comercial%'
  AND COALESCE(LOWER(f.nome), '') NOT LIKE '%supervisor regional%'
`;

const DSR_DIVISOR_PADRAO = 6;

const MESES_MAP = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11
};

const obterFimDoPeriodo = (periodo) => {
  if (!periodo) return null;
  const [mesTxt, anoTxt] = String(periodo).split('/');
  if (!mesTxt || !anoTxt) return null;
  const mes = MESES_MAP[String(mesTxt).toLowerCase()];
  if (mes === undefined) return null;
  const anoNum = Number(anoTxt);
  if (Number.isNaN(anoNum)) return null;
  const ano = anoNum < 100 ? 2000 + anoNum : anoNum;
  return new Date(ano, mes + 1, 0, 23, 59, 59, 999);
};

const estaAtivoNoPeriodo = (colaborador, periodo) => {
  const status = String(colaborador?.status || '').toLowerCase();
  const fimPeriodo = obterFimDoPeriodo(periodo);
  if (!fimPeriodo) return status === 'ativo';

  const dataAtivacao = colaborador?.data_ativacao ? new Date(colaborador.data_ativacao) : null;
  if (dataAtivacao && !Number.isNaN(dataAtivacao.getTime()) && dataAtivacao > fimPeriodo) {
    return false;
  }

  if (!colaborador?.data_inativacao) {
    return status === 'ativo';
  }
  const dataInativacao = new Date(colaborador.data_inativacao);
  if (Number.isNaN(dataInativacao.getTime())) return status === 'ativo';

  return dataInativacao > fimPeriodo;
};

const vendedorSemMovimentoNoPeriodo = (vendas = {}) => {
  const campos = [
    'vendas_volume',
    'vendas_financeiro',
    'mudanca_titularidade_volume',
    'mudanca_titularidade_financeiro',
    'migracao_tecnologia_volume',
    'migracao_tecnologia_financeiro',
    'renovacao_volume',
    'renovacao_financeiro',
    'plano_evento_volume',
    'plano_evento_financeiro',
    'sva_volume',
    'sva_financeiro',
    'telefonia_volume',
    'telefonia_financeiro',
    'vendas_valor',
    'mudanca_titularidade_valor',
    'migracao_tecnologia_valor',
    'renovacao_valor',
    'plano_evento_valor',
    'sva_valor',
    'telefonia_valor',
    'telefonia_financeiro'
  ];
  return campos.every((campo) => (Number(vendas[campo]) || 0) === 0);
};

const PERFIL_VENDEDOR_FILTRO = {
  TODOS: 'todos',
  VENDAS_OU_AMBOS: 'vendas_ou_ambos',
  AMBOS: 'ambos'
};

const normalizarFiltroPerfilVendedor = (valor = '') => {
  const texto = String(valor || '').trim().toLowerCase();
  const textoCanonico = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/__+/g, '_');
  if (!texto) return PERFIL_VENDEDOR_FILTRO.TODOS;
  if (textoCanonico === PERFIL_VENDEDOR_FILTRO.TODOS) return PERFIL_VENDEDOR_FILTRO.TODOS;
  if (
    textoCanonico === PERFIL_VENDEDOR_FILTRO.VENDAS_OU_AMBOS
    || textoCanonico === 'vendasouambos'
    || textoCanonico === 'vendas'
    || textoCanonico === 'somente_vendas'
    || textoCanonico === 'apenas_vendas'
  ) {
    return PERFIL_VENDEDOR_FILTRO.VENDAS_OU_AMBOS;
  }
  if (textoCanonico === PERFIL_VENDEDOR_FILTRO.AMBOS) return PERFIL_VENDEDOR_FILTRO.AMBOS;
  return PERFIL_VENDEDOR_FILTRO.TODOS;
};

const vendedorTemMovimentoVendas = (vendas = {}) => (
  (Number(vendas.vendas_volume) || 0) > 0
  || (Number(vendas.vendas_financeiro) || 0) > 0
);

const vendedorTemMovimentoOutrosTipos = (vendas = {}) => (
  (Number(vendas.mudanca_titularidade_volume) || 0) > 0
  || (Number(vendas.mudanca_titularidade_financeiro) || 0) > 0
  || (Number(vendas.migracao_tecnologia_volume) || 0) > 0
  || (Number(vendas.migracao_tecnologia_financeiro) || 0) > 0
  || (Number(vendas.renovacao_volume) || 0) > 0
  || (Number(vendas.renovacao_financeiro) || 0) > 0
  || (Number(vendas.plano_evento_volume) || 0) > 0
  || (Number(vendas.plano_evento_financeiro) || 0) > 0
  || (Number(vendas.sva_volume) || 0) > 0
  || (Number(vendas.sva_financeiro) || 0) > 0
  || (Number(vendas.telefonia_volume) || 0) > 0
  || (Number(vendas.telefonia_financeiro) || 0) > 0
);

const classificarPerfilMovimentoVendedor = (vendas = {}) => {
  const temVendas = vendedorTemMovimentoVendas(vendas);
  const temOutros = vendedorTemMovimentoOutrosTipos(vendas);
  if (temVendas && temOutros) return PERFIL_VENDEDOR_FILTRO.AMBOS;
  if (temVendas) return 'vendas';
  if (temOutros) return 'outros';
  return 'sem_movimento';
};

const atendeFiltroPerfilVendedor = (vendas = {}, filtroPerfilVendedor = PERFIL_VENDEDOR_FILTRO.TODOS) => {
  if (filtroPerfilVendedor === PERFIL_VENDEDOR_FILTRO.TODOS) return true;

  const temVendas = vendedorTemMovimentoVendas(vendas);
  if (filtroPerfilVendedor === PERFIL_VENDEDOR_FILTRO.VENDAS_OU_AMBOS) {
    return temVendas;
  }

  if (filtroPerfilVendedor === PERFIL_VENDEDOR_FILTRO.AMBOS) {
    return temVendas && vendedorTemMovimentoOutrosTipos(vendas);
  }

  return true;
};

const EXPRESSAO_VOLUME_TOTAL = `
  COALESCE(vendas_volume, 0)
  + COALESCE(mudanca_titularidade_volume, 0)
  + COALESCE(migracao_tecnologia_volume, 0)
  + COALESCE(renovacao_volume, 0)
  + COALESCE(plano_evento_volume, 0)
  + COALESCE(sva_volume, 0)
  + COALESCE(telefonia_volume, 0)
`;

const obterVendedoresComMovimentoRegional = async (periodo, regionalId) => {
  const vendedoresBrutos = await db_all(`
    WITH vendas_periodo AS (
      SELECT
        vendedor_id,
        regional_id,
        SUM(${EXPRESSAO_VOLUME_TOTAL}) AS volume_regional
      FROM vendas_mensais
      WHERE periodo = ?
      GROUP BY vendedor_id, regional_id
    ),
    totais_vendedor AS (
      SELECT
        vendedor_id,
        SUM(volume_regional) AS volume_total_periodo
      FROM vendas_periodo
      GROUP BY vendedor_id
    )
    SELECT
      c.id,
      c.nome,
      c.cpf,
      c.status,
      c.data_ativacao,
      c.data_inativacao,
      f.nome AS funcao_nome,
      vp.volume_regional,
      tv.volume_total_periodo
    FROM vendas_periodo vp
    INNER JOIN totais_vendedor tv ON tv.vendedor_id = vp.vendedor_id
    INNER JOIN colaboradores c ON c.id = vp.vendedor_id
    LEFT JOIN funcoes f ON f.id = c.funcao_id
    WHERE vp.regional_id = ?
      AND ${FILTRO_EXCLUIR_LIDERANCAS}
    ORDER BY c.nome
  `, [periodo, regionalId]);

  const vendedoresAtivos = vendedoresBrutos.filter((c) => {
    if (!estaAtivoNoPeriodo(c, periodo)) return false;
    const volumeTotal = Number(c.volume_total_periodo) || 0;
    return volumeTotal > 0;
  });

  const qtdVendedoresFte = vendedoresAtivos.reduce((acc, vendedor) => {
    const volumeRegional = Number(vendedor.volume_regional) || 0;
    const volumeTotal = Number(vendedor.volume_total_periodo) || 0;
    if (volumeRegional <= 0 || volumeTotal <= 0) return acc;
    return acc + (volumeRegional / volumeTotal);
  }, 0);

  return {
    vendedores: vendedoresAtivos,
    qtdVendedoresHeadcount: vendedoresAtivos.length,
    qtdVendedoresFte
  };
};

const TIPO_META_FILTROS = {
  vendas: ['vendas', 'VENDAS'],
  churn: ['churn', 'CHURN'],
  mudanca_titularidade: [
    'mudança de titularidade',
    'mudanca de titularidade',
    'mudanã§a de titularidade',
    'MUDANÇA DE TITULARIDADE',
    'MUDANCA DE TITULARIDADE'
  ],
  migracao_tecnologia: [
    'migração de tecnologia',
    'migracao de tecnologia',
    'migraã§ã£o de tecnologia',
    'MIGRAÇÃO DE TECNOLOGIA',
    'MIGRACAO DE TECNOLOGIA'
  ],
  renovacao: ['renovação', 'renovacao', 'renovaã§ã£o', 'RENOVAÇÃO', 'RENOVACAO'],
  plano_evento: ['plano evento', 'PLANO EVENTO'],
  sva: ['sva', 'SVA'],
  telefonia: ['telefonia', 'TELEFONIA']
};

const montarFiltroTipoMeta = (chave) => {
  const valoresOriginais = Array.from(new Set(TIPO_META_FILTROS[chave] || []));
  const valoresLower = Array.from(new Set(valoresOriginais.map((v) => String(v).toLowerCase())));
  const listaOriginais = valoresOriginais.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
  const listaLower = valoresLower.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
  return `(LOWER(tipoMeta) IN (${listaLower}) OR tipoMeta IN (${listaOriginais}))`;
};

/**
 * Calcula o percentual de comissÃ£o baseado nas metas em degraus
 * @param {number} valorAtingido 
 * @param {object} meta - ContÃ©m meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent
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

  debugLog('ðŸ› [calcularPercentualPorMeta] ENTRADA:', {
    valorAtingido,
    meta,
    inverterPolaridade,
    meta1Percent, meta2Percent, meta3Percent
  });

  if (inverterPolaridade) {
    // Churn: quanto menor, melhor
    if (valorAtingido <= meta1Volume) {
      debugLog('ðŸ› Churn: retorna meta1Percent =', meta1Percent);
      return meta1Percent;
    }
    if (valorAtingido <= meta2Volume) {
      debugLog('ðŸ› Churn: retorna meta2Percent =', meta2Percent);
      return meta2Percent;
    }
    if (valorAtingido <= meta3Volume) {
      debugLog('ðŸ› Churn: retorna meta3Percent =', meta3Percent);
      return meta3Percent;
    }
  } else {
    // Vendas: quanto maior, melhor - CORRIGIDO: verifica meta3 (menor) primeiro
    debugLog(`ðŸ› Vendas: ${valorAtingido} >= ${meta3Volume}? ${valorAtingido >= meta3Volume}`);
    if (valorAtingido >= meta3Volume) {
      debugLog(`ðŸ› Vendas: ${valorAtingido} >= ${meta2Volume}? ${valorAtingido >= meta2Volume}`);
      if (valorAtingido >= meta2Volume) {
        debugLog(`ðŸ› Vendas: ${valorAtingido} >= ${meta1Volume}? ${valorAtingido >= meta1Volume}`);
        if (valorAtingido >= meta1Volume) {
          debugLog('ðŸ› Vendas: retorna meta1Percent =', meta1Percent);
          return meta1Percent;
        } else {
          debugLog('ðŸ› Vendas: retorna meta2Percent =', meta2Percent);
          return meta2Percent;
        }
      } else {
        debugLog('ðŸ› Vendas: retorna meta3Percent =', meta3Percent);
        return meta3Percent;
      }
    }
  }
  
  debugLog('ðŸ› Abaixo da meta mÃ­nima: retorna 0');
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
        erro: 'PerÃ­odo e regionalId sÃ£o obrigatÃ³rios' 
      });
    }

    // 1) Buscar informaÃ§Ãµes da regional
    const regional = await db_get(
      'SELECT id, nome FROM regionais WHERE id = ?',
      [regionalId]
    );

    if (!regional) {
      return res.status(404).json({ erro: 'Regional nÃ£o encontrada' });
    }

    // 2) Buscar base de vendedores ativos com movimento no periodo e FTE da regional
    const baseVendedoresRegional = await obterVendedoresComMovimentoRegional(periodo, regionalId);
    const qtdVendedores = baseVendedoresRegional.qtdVendedoresHeadcount;
    const qtdVendedoresFte = baseVendedoresRegional.qtdVendedoresFte;

    // 3) Buscar regras de comissÃ£o (metas, pesos, incremento global)
    const metaVendas = await db_get(`
      SELECT 
        meta1Volume, meta1Percent,
        meta2Volume, meta2Percent,
        meta3Volume, meta3Percent,
        incrementoGlobal,
        pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('vendas')}
    `, [regionalId, periodo]);

    const metaChurn = await db_get(`
      SELECT 
        meta1Volume, meta1Percent,
        meta2Volume, meta2Percent,
        meta3Volume, meta3Percent
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('churn')}
    `, [regionalId, periodo]);

    if (!metaVendas && !metaChurn) {
      return res.status(404).json({ 
        erro: 'Nenhuma regra de comissÃ£o encontrada para esta regional e perÃ­odo' 
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
    // Exemplo: se pesoVendasChurn = 0.4, entÃ£o peso vendas = 40%, peso churn = 60%
    const pesoVendasChurn = normalizarPeso(metaVendas?.pesoVendasChurn, 0.5); // PadrÃ£o 50/50
    const pesoVendas = pesoVendasChurn; // Este Ã© o peso de vendas (0 a 1)
    const pesoChurn = 1 - pesoVendasChurn; // O complemento Ã© o peso de churn

    // 7) Percentual obtido Ã— peso de vendas
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

    // 12) Percentual churn Ã— peso de churn
    const percentualChurnPonderado = percentualChurn * pesoChurn;

    // ===== BUSCAR OUTROS TIPOS DE MÃ‰TRICAS =====
    
    // MudanÃ§a de titularidade
    const metaMudancaTitularidade = await db_get(`
      SELECT meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('mudanca_titularidade')}
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

    // MigraÃ§Ã£o de tecnologia
    const metaMigracaoTecnologia = await db_get(`
      SELECT meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('migracao_tecnologia')}
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

    // RenovaÃ§Ã£o
    const metaRenovacao = await db_get(`
      SELECT meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('renovacao')}
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
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('plano_evento')}
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
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('sva')}
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
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('telefonia')}
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

    // 13) Soma dos percentuais ponderados (apenas Vendas e Churn tÃªm peso)
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
      qtdVendedoresFte,
      
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

      // MudanÃ§a de titularidade
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

      // MigraÃ§Ã£o de tecnologia
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

      // RenovaÃ§Ã£o
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
 * Retorna dados individuais de cada vendedor da regional no perÃ­odo
 */
exports.listarVendedores = async (req, res) => {
  try {
    const { periodo, regionalId } = req.query;
    const filtroPerfilVendedor = normalizarFiltroPerfilVendedor(
      req.query?.filtroPerfilVendedor || req.query?.perfilVendedor || req.query?.perfil
    );

    debugLog('ðŸ” [listarVendedores] Params recebidos:', {
      periodo,
      regionalId,
      filtroPerfilVendedor
    });

    if (!periodo || !regionalId) {
      return res.status(400).json({ 
        erro: 'PerÃ­odo e regionalId sÃ£o obrigatÃ³rios' 
      });
    }

    // Buscar regras de comissÃ£o para vendas (meta individual)
    debugLog('ðŸ”Ž [listarVendedores] Buscando metaVendas');
    debugLog('   regionalId:', regionalId);
    debugLog('   periodo:', periodo);
    let metaVendas = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal,
        pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('vendas')}
      LIMIT 1
    `, [regionalId, periodo]);

    debugLog('ðŸ“Š [listarVendedores] Meta vendas resultado:', JSON.stringify(metaVendas, null, 2));

    if (!metaVendas) {
      metaVendas = {
        meta1Volume: 0,
        meta1Percent: 0,
        meta1PercentIndividual: 0,
        meta2Volume: 0,
        meta2Percent: 0,
        meta2PercentIndividual: 0,
        meta3Volume: 0,
        meta3Percent: 0,
        meta3PercentIndividual: 0,
        incrementoGlobal: 0,
        pesoVendasChurn: 0.5
      };
    }

    // ===== CALCULAR SOMA DOS PERCENTUAIS PONDERADOS EM TEMPO REAL =====
    
    // Buscar regra de churn
    const metaChurn = await db_get(`
      SELECT 
        meta1Volume, meta1Percent,
        meta2Volume, meta2Percent,
        meta3Volume, meta3Percent
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('churn')}
      LIMIT 1
    `, [regionalId, periodo]);
    
    debugLog('ðŸ”§ [listarVendedores] metaChurn recuperada:', metaChurn ? 'SIM' : 'NÃƒO', metaChurn);

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

    debugLog('ðŸ“ˆ [listarVendedores] CÃ¡lculo de soma percentuais ponderados:');
    debugLog(`   Vendas realizado: ${totalVendasRealizado} | Percentual: ${(percentualVendas * 100).toFixed(2)}% | Ponderado: ${(percentualVendasPonderado * 100).toFixed(2)}%`);
    debugLog(`   Churn realizado: ${totalChurnRealizado} | Percentual: ${(percentualChurn * 100).toFixed(2)}% | Ponderado: ${(percentualChurnPonderado * 100).toFixed(2)}%`);
    debugLog(`   SOMA DOS PERCENTUAIS PONDERADOS: ${(somaPercentuaisPonderados * 100).toFixed(2)}%`);

    // ===== BUSCAR METAS PARA OUTROS TIPOS DE MÃ‰TRICAS =====
    
    const metaMudancaTitularidade = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('mudanca_titularidade')}
    `, [regionalId, periodo]);

    const metaMigracaoTecnologia = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('migracao_tecnologia')}
    `, [regionalId, periodo]);

    const metaRenovacao = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('renovacao')}
    `, [regionalId, periodo]);

    const metaPlanoEvento = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('plano_evento')}
    `, [regionalId, periodo]);

    const metaSva = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('sva')}
    `, [regionalId, periodo]);

    const metaTelefonia = await db_get(`
      SELECT 
        meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal
      FROM regras_comissao
      WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('telefonia')}
    `, [regionalId, periodo]);

    // ===== CALCULAR PERCENTUAL DE RESUMO PARA CADA MÃ‰TRICA =====
    
    // MudanÃ§a de Titularidade
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

    // MigraÃ§Ã£o de Tecnologia
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

    // RenovaÃ§Ã£o
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

    // Buscar vendedores ativos com movimento na regional no periodo (historico de vendas)
    const baseVendedores = await obterVendedoresComMovimentoRegional(periodo, regionalId);
    const vendedores = baseVendedores.vendedores;
    const qtdVendedoresFte = baseVendedores.qtdVendedoresFte;

    debugLog('ðŸ‘¥ [listarVendedores] Vendedores encontrados:', vendedores.length);

    // Calcular metas individuais por vendedor (denominador proporcional FTE)
    const totalVendedores = qtdVendedoresFte || vendedores.length || 0;
    
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

    // MUDANÃ‡A DE TITULARIDADE - Meta Individual
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

    // MIGRAÃ‡ÃƒO DE TECNOLOGIA - Meta Individual
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

    // RENOVAÃ‡ÃƒO - Meta Individual
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

    const vendasVendedoresLista = await db_all(`
      SELECT
        vendedor_id,
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
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);
    const vendasPorVendedor = new Map(
      (vendasVendedoresLista || []).map((item) => [item.vendedor_id, item])
    );

    // Para cada vendedor, buscar suas vendas e calcular percentual e comissao
    const vendedoresComDados = [];

    // FunÃ§Ã£o para calcular comissÃ£o (definida fora do loop)
    // FÃ³rmula: (VALOR TOTAL Ã— % ATINGIDO no RESUMO **especÃ­fico** da mÃ©trica) + (VALOR TOTAL Ã— % ALCANÃ‡ADO individual)
    const calcularComissaoTipo = (valorFinanceiro, percentualResumoTipo, percentualAlcancadoTipo) => {
      if (!valorFinanceiro || valorFinanceiro === 0) return 0;
      return (valorFinanceiro * percentualResumoTipo) + 
             (valorFinanceiro * percentualAlcancadoTipo);
    };

    for (const vendedor of vendedores) {
      const vendasVendedor = vendasPorVendedor.get(vendedor.id);

      // Se nÃ£o houver vendas, criar objeto vazio
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

      if (vendedorSemMovimentoNoPeriodo(vendas)) {
        continue;
      }

      if (!atendeFiltroPerfilVendedor(vendas, filtroPerfilVendedor)) {
        continue;
      }

      const volumeRegional = Number(vendedor.volume_regional) || 0;
      const volumeTotalPeriodo = Number(vendedor.volume_total_periodo) || 0;
      const ftePesoRegional = (
        volumeRegional > 0 && volumeTotalPeriodo > 0
          ? (volumeRegional / volumeTotalPeriodo)
          : 0
      );
      const perfilMovimento = classificarPerfilMovimentoVendedor(vendas);

      // Calcular percentual alcanÃ§ado na meta individual de vendas
      const volumeVendas = vendas.vendas_volume || 0;
      let percentualAlcancado = 0;

      // Mesma lÃ³gica de calcular percentual (quanto maior, melhor)
      const meta1PercentIndividual = normalizarPercentual(metaVendas.meta1PercentIndividual);
      const meta2PercentIndividual = normalizarPercentual(metaVendas.meta2PercentIndividual);
      const meta3PercentIndividual = normalizarPercentual(metaVendas.meta3PercentIndividual);

      if (volumeVendas >= metaIndividual3) {
        // Se atingiu meta3 (menor), aplicar meta3Percent
        if (volumeVendas >= metaIndividual2) {
          // Se atingiu meta2 (mÃ©dia), aplicar meta2Percent
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

      // Calcular percentual alcanÃ§ado na meta individual de MUDANÃ‡A DE TITULARIDADE
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
          // Atingiu Meta2 (mÃ©dia)
          percentualMudancaTitularidadeVendedor = meta2PercentIndividualMudanca;
        } else if (volumeMudancaTitularidade >= metaIndividualMudanca3) {
          // Atingiu Meta3 (mÃ­nima)
          percentualMudancaTitularidadeVendedor = meta3PercentIndividualMudanca;
        } else {
          // NÃ£o atingiu nenhuma meta
          percentualMudancaTitularidadeVendedor = 0;
        }
      }

      // Calcular percentual alcanÃ§ado na meta individual de MIGRAÃ‡ÃƒO DE TECNOLOGIA
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

      // Calcular percentual alcanÃ§ado na meta individual de RENOVAÃ‡ÃƒO
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

      // Calcular percentual alcanÃ§ado na meta individual de PLANO EVENTO
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

      // Calcular percentual alcanÃ§ado na meta individual de SVA
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

      // Calcular percentual alcanÃ§ado na meta individual de TELEFONIA
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
        funcaoNome: vendedor.funcao_nome || 'Vendedor',
        perfilMovimento,
        ftePesoRegional,
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

    debugLog('âœ… [listarVendedores] Retornando:', vendedoresComDados.length, 'vendedores');

    const qtdVendedoresFteFiltrado = vendedoresComDados.reduce(
      (acc, item) => acc + (Number(item.ftePesoRegional) || 0),
      0
    );

    res.json({
      periodo,
      regionalId,
      filtroPerfilVendedor,
      somaPercentuaisPonderados,
      qtdVendedoresFte: qtdVendedoresFteFiltrado > 0
        ? qtdVendedoresFteFiltrado
        : vendedoresComDados.length,
      qtdVendedoresFteBase: qtdVendedoresFte,
      qtdVendedores: vendedoresComDados.length,
      vendedores: vendedoresComDados
    });

  } catch (erro) {
    console.error('âŒ [listarVendedores] Erro ao listar vendedores:', erro);
    console.error('Stack trace:', erro.stack);
    res.status(500).json({ 
      erro: 'Erro ao listar vendedores',
      detalhes: erro.message 
    });
  }
};

/**
 * Lista consolidado de comissionamento de todas as regionais no perÃ­odo
 * GET /api/comissionamento/consolidado?periodo=Jan/25
 */
exports.listarConsolidado = async (req, res) => {
  try {
    const { periodo } = req.query;

    debugLog('ðŸ” [listarConsolidado] Params recebidos:', { periodo });

    if (!periodo) {
      return res.status(400).json({ 
        erro: 'PerÃ­odo Ã© obrigatÃ³rio' 
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

    debugLog('ðŸŒ [listarConsolidado] Regionais encontradas:', regionais.length);

    const resultado = [];

    // Reutiliza a mesma fonte e regra do endpoint de vendedores por regional
    for (const regional of regionais) {
      let dadosRegional = { vendedores: [] };
      try {
        dadosRegional = await obterVendedoresRegional(periodo, regional.id);
      } catch (erroRegional) {
        dadosRegional = { vendedores: [] };
      }

      const vendedores = Array.isArray(dadosRegional?.vendedores) ? dadosRegional.vendedores : [];
      for (const vendedor of vendedores) {
        resultado.push({
          regional: regional.nome,
          vendedor: vendedor.nome,
          comissaoVendas: Number(vendedor.vendas?.comissao) || 0,
          comissaoChurn: Number(vendedor.churn?.comissao) || 0,
          comissaoMudancaTitularidade: Number(vendedor.mudancaTitularidade?.comissao) || 0,
          comissaoMigracaoTecnologia: Number(vendedor.migracaoTecnologia?.comissao) || 0,
          comissaoRenovacao: Number(vendedor.renovacao?.comissao) || 0,
          comissaoPlanoEvento: Number(vendedor.planoEvento?.comissao) || 0,
          comissaoSVA: Number(vendedor.sva?.comissao) || 0,
          comissaoTelefonia: Number(vendedor.telefonia?.comissao) || 0
        });
      }
    }

    debugLog('âœ… [listarConsolidado] Retornando:', resultado.length, 'linhas');

    res.json({
      periodo,
      linhas: resultado
    });

  } catch (erro) {
    console.error('âŒ [listarConsolidado] Erro ao listar consolidado:', erro);
    console.error('Stack trace:', erro.stack);
    res.status(500).json({ 
      erro: 'Erro ao listar consolidado',
      detalhes: erro.message 
    });
  }
};

// POST /api/comissionamento/simulador
// Body:
// {
//   periodo: "Mar/26",
//   regionalId: "...",
//   vendedorId: "...",
//   simulacao: {
//     vendas: { quantidade, valorTotal },
//     churn: { quantidade },
//     mudancaTitularidade: { quantidade, valorTotal },
//     migracaoTecnologia: { quantidade, valorTotal },
//     renovacao: { quantidade, valorTotal },
//     planoEvento: { quantidade, valorTotal },
//     sva: { quantidade, valorTotal },
//     telefonia: { quantidade, valorTotal }
//   }
// }
exports.simularRemuneracaoVendedor = async (req, res) => {
  try {
    const { periodo, regionalId, vendedorId } = req.body || {};
    const simulacao = req.body?.simulacao || {};

    if (!periodo || !regionalId || !vendedorId) {
      return res.status(400).json({ erro: 'Periodo, regionalId e vendedorId sao obrigatorios' });
    }

    const [regional, vendedor] = await Promise.all([
      db_get('SELECT id, nome FROM regionais WHERE id = ?', [regionalId]),
      db_get('SELECT id, nome, cpf, status, data_ativacao, data_inativacao FROM colaboradores WHERE id = ?', [vendedorId])
    ]);

    if (!regional) {
      return res.status(404).json({ erro: 'Regional nao encontrada' });
    }
    if (!vendedor) {
      return res.status(404).json({ erro: 'Vendedor nao encontrado' });
    }

    const baseRegional = await obterVendedoresComMovimentoRegional(periodo, regionalId);
    const qtdVendedoresHeadcount = Number(baseRegional?.qtdVendedoresHeadcount) || 0;
    const qtdVendedoresFte = Number(baseRegional?.qtdVendedoresFte) || 0;
    const totalVendedoresBase = qtdVendedoresFte || qtdVendedoresHeadcount || 0;

    const [
      metaVendas,
      metaChurn,
      metaMudancaTitularidade,
      metaMigracaoTecnologia,
      metaRenovacao,
      metaPlanoEvento,
      metaSva,
      metaTelefonia
    ] = await Promise.all([
      db_get(`SELECT * FROM regras_comissao WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('vendas')} LIMIT 1`, [regionalId, periodo]),
      db_get(`SELECT * FROM regras_comissao WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('churn')} LIMIT 1`, [regionalId, periodo]),
      db_get(`SELECT * FROM regras_comissao WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('mudanca_titularidade')} LIMIT 1`, [regionalId, periodo]),
      db_get(`SELECT * FROM regras_comissao WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('migracao_tecnologia')} LIMIT 1`, [regionalId, periodo]),
      db_get(`SELECT * FROM regras_comissao WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('renovacao')} LIMIT 1`, [regionalId, periodo]),
      db_get(`SELECT * FROM regras_comissao WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('plano_evento')} LIMIT 1`, [regionalId, periodo]),
      db_get(`SELECT * FROM regras_comissao WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('sva')} LIMIT 1`, [regionalId, periodo]),
      db_get(`SELECT * FROM regras_comissao WHERE regionalId = ? AND periodo = ? AND ${montarFiltroTipoMeta('telefonia')} LIMIT 1`, [regionalId, periodo])
    ]);

    if (!metaVendas && !metaChurn) {
      return res.status(404).json({ erro: 'Nao ha regras de comissionamento para a regional e periodo informados' });
    }

    const totaisRegionais = await db_get(`
      SELECT
        SUM(vendas_volume) AS totalVendasVolume,
        SUM(mudanca_titularidade_volume) AS totalMudancaTitularidadeVolume,
        SUM(migracao_tecnologia_volume) AS totalMigracaoTecnologiaVolume,
        SUM(renovacao_volume) AS totalRenovacaoVolume,
        SUM(plano_evento_volume) AS totalPlanoEventoVolume,
        SUM(sva_volume) AS totalSvaVolume,
        SUM(telefonia_volume) AS totalTelefoniaVolume
      FROM vendas_mensais
      WHERE regional_id = ? AND periodo = ?
    `, [regionalId, periodo]);

    const churnRegional = await db_get(
      'SELECT churn FROM churn_regionais WHERE regional_id = ? AND periodo = ?',
      [regionalId, periodo]
    );

    const totalVendasRealizado = Number(totaisRegionais?.totalVendasVolume) || 0;
    const totalChurnRealizado = Number(churnRegional?.churn) || 0;
    const totalMudancaTitularidade = Number(totaisRegionais?.totalMudancaTitularidadeVolume) || 0;
    const totalMigracaoTecnologia = Number(totaisRegionais?.totalMigracaoTecnologiaVolume) || 0;
    const totalRenovacao = Number(totaisRegionais?.totalRenovacaoVolume) || 0;
    const totalPlanoEvento = Number(totaisRegionais?.totalPlanoEventoVolume) || 0;
    const totalSva = Number(totaisRegionais?.totalSvaVolume) || 0;
    const totalTelefonia = Number(totaisRegionais?.totalTelefoniaVolume) || 0;

    const percentualVendas = metaVendas ? calcularPercentualPorMeta(totalVendasRealizado, metaVendas) : 0;
    const percentualChurn = metaChurn ? calcularPercentualPorMeta(totalChurnRealizado, metaChurn, true) : 0;
    const pesoVendas = normalizarPeso(metaVendas?.pesoVendasChurn, 0.5);
    const pesoChurn = 1 - pesoVendas;
    const somaPercentuaisPonderados = (percentualVendas * pesoVendas) + (percentualChurn * pesoChurn);

    const percentualMudancaTitularidadeResumo = metaMudancaTitularidade
      ? calcularPercentualPorMeta(totalMudancaTitularidade, metaMudancaTitularidade)
      : 0;
    const percentualMigracaoTecnologiaResumo = metaMigracaoTecnologia
      ? calcularPercentualPorMeta(totalMigracaoTecnologia, metaMigracaoTecnologia)
      : 0;
    const percentualRenovacaoResumo = metaRenovacao
      ? calcularPercentualPorMeta(totalRenovacao, metaRenovacao)
      : 0;
    const percentualPlanoEventoResumo = metaPlanoEvento
      ? calcularPercentualPorMeta(totalPlanoEvento, metaPlanoEvento)
      : 0;
    const percentualSvaResumo = metaSva
      ? calcularPercentualPorMeta(totalSva, metaSva)
      : 0;
    const percentualTelefoniaResumo = metaTelefonia
      ? calcularPercentualPorMeta(totalTelefonia, metaTelefonia)
      : 0;

    const baseVendedor = await db_get(`
      SELECT
        SUM(vendas_volume) AS vendas_volume,
        SUM(vendas_financeiro) AS vendas_financeiro,
        SUM(mudanca_titularidade_volume) AS mudanca_titularidade_volume,
        SUM(mudanca_titularidade_financeiro) AS mudanca_titularidade_financeiro,
        SUM(migracao_tecnologia_volume) AS migracao_tecnologia_volume,
        SUM(migracao_tecnologia_financeiro) AS migracao_tecnologia_financeiro,
        SUM(renovacao_volume) AS renovacao_volume,
        SUM(renovacao_financeiro) AS renovacao_financeiro,
        SUM(plano_evento_volume) AS plano_evento_volume,
        SUM(plano_evento_financeiro) AS plano_evento_financeiro,
        SUM(sva_volume) AS sva_volume,
        SUM(sva_financeiro) AS sva_financeiro,
        SUM(telefonia_volume) AS telefonia_volume,
        SUM(telefonia_financeiro) AS telefonia_financeiro
      FROM vendas_mensais
      WHERE vendedor_id = ? AND regional_id = ? AND periodo = ?
    `, [vendedorId, regionalId, periodo]);

    const baseMetricas = {
      vendas: {
        quantidade: Number(baseVendedor?.vendas_volume) || 0,
        valorTotal: Number(baseVendedor?.vendas_financeiro) || 0
      },
      churn: {
        quantidade: totalChurnRealizado,
        valorTotal: 0
      },
      mudancaTitularidade: {
        quantidade: Number(baseVendedor?.mudanca_titularidade_volume) || 0,
        valorTotal: Number(baseVendedor?.mudanca_titularidade_financeiro) || 0
      },
      migracaoTecnologia: {
        quantidade: Number(baseVendedor?.migracao_tecnologia_volume) || 0,
        valorTotal: Number(baseVendedor?.migracao_tecnologia_financeiro) || 0
      },
      renovacao: {
        quantidade: Number(baseVendedor?.renovacao_volume) || 0,
        valorTotal: Number(baseVendedor?.renovacao_financeiro) || 0
      },
      planoEvento: {
        quantidade: Number(baseVendedor?.plano_evento_volume) || 0,
        valorTotal: Number(baseVendedor?.plano_evento_financeiro) || 0
      },
      sva: {
        quantidade: Number(baseVendedor?.sva_volume) || 0,
        valorTotal: Number(baseVendedor?.sva_financeiro) || 0
      },
      telefonia: {
        quantidade: Number(baseVendedor?.telefonia_volume) || 0,
        valorTotal: Number(baseVendedor?.telefonia_financeiro) || 0
      }
    };

    const metricasEfetivas = {
      vendas: {
        quantidade: Number(simulacao?.vendas?.quantidade ?? baseMetricas.vendas.quantidade) || 0,
        valorTotal: Number(simulacao?.vendas?.valorTotal ?? baseMetricas.vendas.valorTotal) || 0
      },
      churn: {
        quantidade: Number(simulacao?.churn?.quantidade ?? baseMetricas.churn.quantidade) || 0,
        valorTotal: 0
      },
      mudancaTitularidade: {
        quantidade: Number(simulacao?.mudancaTitularidade?.quantidade ?? baseMetricas.mudancaTitularidade.quantidade) || 0,
        valorTotal: Number(simulacao?.mudancaTitularidade?.valorTotal ?? baseMetricas.mudancaTitularidade.valorTotal) || 0
      },
      migracaoTecnologia: {
        quantidade: Number(simulacao?.migracaoTecnologia?.quantidade ?? baseMetricas.migracaoTecnologia.quantidade) || 0,
        valorTotal: Number(simulacao?.migracaoTecnologia?.valorTotal ?? baseMetricas.migracaoTecnologia.valorTotal) || 0
      },
      renovacao: {
        quantidade: Number(simulacao?.renovacao?.quantidade ?? baseMetricas.renovacao.quantidade) || 0,
        valorTotal: Number(simulacao?.renovacao?.valorTotal ?? baseMetricas.renovacao.valorTotal) || 0
      },
      planoEvento: {
        quantidade: Number(simulacao?.planoEvento?.quantidade ?? baseMetricas.planoEvento.quantidade) || 0,
        valorTotal: Number(simulacao?.planoEvento?.valorTotal ?? baseMetricas.planoEvento.valorTotal) || 0
      },
      sva: {
        quantidade: Number(simulacao?.sva?.quantidade ?? baseMetricas.sva.quantidade) || 0,
        valorTotal: Number(simulacao?.sva?.valorTotal ?? baseMetricas.sva.valorTotal) || 0
      },
      telefonia: {
        quantidade: Number(simulacao?.telefonia?.quantidade ?? baseMetricas.telefonia.quantidade) || 0,
        valorTotal: Number(simulacao?.telefonia?.valorTotal ?? baseMetricas.telefonia.valorTotal) || 0
      }
    };

    const calcularMetaIndividual = (regra) => {
      const incrementoGlobal = normalizarPercentual(regra?.incrementoGlobal || 0);
      const meta1 = normalizarNumero(regra?.meta1Volume || 0);
      const meta2 = normalizarNumero(regra?.meta2Volume || 0);
      const meta3 = normalizarNumero(regra?.meta3Volume || 0);
      const divisor = totalVendedoresBase > 0 ? totalVendedoresBase : 0;
      if (divisor <= 0) {
        return { meta1: 0, meta2: 0, meta3: 0 };
      }
      return {
        meta1: (meta1 / divisor) * (1 + incrementoGlobal),
        meta2: (meta2 / divisor) * (1 + incrementoGlobal),
        meta3: (meta3 / divisor) * (1 + incrementoGlobal)
      };
    };

    const calcularPercentualIndividual = (quantidade, regra, metasIndividuais, inverterPolaridade = false) => {
      const meta1PercentIndividual = normalizarPercentual(regra?.meta1PercentIndividual || 0);
      const meta2PercentIndividual = normalizarPercentual(regra?.meta2PercentIndividual || 0);
      const meta3PercentIndividual = normalizarPercentual(regra?.meta3PercentIndividual || 0);
      const q = Number(quantidade) || 0;

      if (inverterPolaridade) {
        if (q <= metasIndividuais.meta1) return meta1PercentIndividual;
        if (q <= metasIndividuais.meta2) return meta2PercentIndividual;
        if (q <= metasIndividuais.meta3) return meta3PercentIndividual;
        return 0;
      }

      if (q >= metasIndividuais.meta3) {
        if (q >= metasIndividuais.meta2) {
          if (q >= metasIndividuais.meta1) return meta1PercentIndividual;
          return meta2PercentIndividual;
        }
        return meta3PercentIndividual;
      }
      return 0;
    };

    const calcularComissaoTipo = (valorFinanceiro, percentualResumoTipo, percentualAlcancadoTipo) => {
      if (!valorFinanceiro || valorFinanceiro === 0) return 0;
      return (valorFinanceiro * percentualResumoTipo) + (valorFinanceiro * percentualAlcancadoTipo);
    };

    const regrasPorTipo = {
      vendas: metaVendas,
      churn: metaChurn,
      mudancaTitularidade: metaMudancaTitularidade,
      migracaoTecnologia: metaMigracaoTecnologia,
      renovacao: metaRenovacao,
      planoEvento: metaPlanoEvento,
      sva: metaSva,
      telefonia: metaTelefonia
    };

    const percentuaisResumoPorTipo = {
      vendas: somaPercentuaisPonderados,
      churn: percentualChurn,
      mudancaTitularidade: percentualMudancaTitularidadeResumo,
      migracaoTecnologia: percentualMigracaoTecnologiaResumo,
      renovacao: percentualRenovacaoResumo,
      planoEvento: percentualPlanoEventoResumo,
      sva: percentualSvaResumo,
      telefonia: percentualTelefoniaResumo
    };

    const labelsTipos = {
      vendas: 'Vendas',
      churn: 'Churn',
      mudancaTitularidade: 'Mudanca de Titularidade',
      migracaoTecnologia: 'Migracao de Tecnologia',
      renovacao: 'Renovacao',
      planoEvento: 'Plano Evento',
      sva: 'SVA',
      telefonia: 'Telefonia'
    };

    const etapas = Object.keys(labelsTipos).map((tipo) => {
      const regra = regrasPorTipo[tipo] || null;
      const metasIndividuais = calcularMetaIndividual(regra);
      const entrada = metricasEfetivas[tipo] || { quantidade: 0, valorTotal: 0 };
      const percentualIndividual = calcularPercentualIndividual(
        entrada.quantidade,
        regra,
        metasIndividuais,
        tipo === 'churn'
      );
      const percentualResumo = Number(percentuaisResumoPorTipo[tipo]) || 0;
      const comissao = tipo === 'churn'
        ? 0
        : calcularComissaoTipo(entrada.valorTotal, percentualResumo, percentualIndividual);

      return {
        tipo,
        label: labelsTipos[tipo],
        entrada,
        metaIndividual: metasIndividuais,
        percentualResumo,
        percentualIndividual,
        formula: tipo === 'churn'
          ? 'Tipo de controle regional (impacta a ponderacao de Vendas+Churn; sem financeiro direto no vendedor)'
          : '(valorTotal * percentualResumo) + (valorTotal * percentualIndividual)',
        comissao
      };
    });

    const totalComissao = etapas.reduce((acc, etapa) => acc + (Number(etapa.comissao) || 0), 0);
    const dsr = totalComissao / DSR_DIVISOR_PADRAO;
    const totalComDsr = totalComissao + dsr;

    const exportarRegra = (regra) => {
      if (!regra) return null;
      return {
        id: regra.id,
        tipoMetaId: regra.tipoMetaId,
        meta1Volume: normalizarNumero(regra.meta1Volume || 0),
        meta2Volume: normalizarNumero(regra.meta2Volume || 0),
        meta3Volume: normalizarNumero(regra.meta3Volume || 0),
        meta1Percent: normalizarPercentual(regra.meta1Percent || 0),
        meta2Percent: normalizarPercentual(regra.meta2Percent || 0),
        meta3Percent: normalizarPercentual(regra.meta3Percent || 0),
        meta1PercentIndividual: normalizarPercentual(regra.meta1PercentIndividual || 0),
        meta2PercentIndividual: normalizarPercentual(regra.meta2PercentIndividual || 0),
        meta3PercentIndividual: normalizarPercentual(regra.meta3PercentIndividual || 0),
        incrementoGlobal: normalizarPercentual(regra.incrementoGlobal || 0),
        pesoVendasChurn: normalizarPeso(regra.pesoVendasChurn, 0.5)
      };
    };

    const realizadoRegionalPorTipo = {
      vendas: totalVendasRealizado,
      churn: totalChurnRealizado,
      mudancaTitularidade: totalMudancaTitularidade,
      migracaoTecnologia: totalMigracaoTecnologia,
      renovacao: totalRenovacao,
      planoEvento: totalPlanoEvento,
      sva: totalSva,
      telefonia: totalTelefonia
    };

    const regrasCompletasPorTipo = {
      vendas: exportarRegra(metaVendas),
      churn: exportarRegra(metaChurn),
      mudancaTitularidade: exportarRegra(metaMudancaTitularidade),
      migracaoTecnologia: exportarRegra(metaMigracaoTecnologia),
      renovacao: exportarRegra(metaRenovacao),
      planoEvento: exportarRegra(metaPlanoEvento),
      sva: exportarRegra(metaSva),
      telefonia: exportarRegra(metaTelefonia)
    };

    return res.json({
      periodo,
      regional: {
        id: regional.id,
        nome: regional.nome
      },
      vendedor: {
        id: vendedor.id,
        nome: vendedor.nome,
        cpf: vendedor.cpf
      },
      contexto: {
        baseCalculo: 'FTE-first',
        qtdVendedoresHeadcount,
        qtdVendedoresFte,
        totalVendedoresBase
      },
      resumoRegional: {
        vendas: {
          realizado: totalVendasRealizado,
          percentualResumo: percentualVendas,
          peso: pesoVendas
        },
        churn: {
          realizado: totalChurnRealizado,
          percentualResumo: percentualChurn,
          peso: pesoChurn
        },
        somaPercentuaisPonderados
      },
      regras: regrasCompletasPorTipo,
      regionalRealizado: realizadoRegionalPorTipo,
      percentuaisRegionais: {
        vendas: percentualVendas,
        churn: percentualChurn,
        mudancaTitularidade: percentualMudancaTitularidadeResumo,
        migracaoTecnologia: percentualMigracaoTecnologiaResumo,
        renovacao: percentualRenovacaoResumo,
        planoEvento: percentualPlanoEventoResumo,
        sva: percentualSvaResumo,
        telefonia: percentualTelefoniaResumo
      },
      entradas: {
        base: baseMetricas,
        simulacao: simulacao || {},
        efetivo: metricasEfetivas
      },
      etapas,
      resultado: {
        totalComissao,
        dsr,
        totalComDsr
      }
    });
  } catch (erro) {
    console.error('Erro ao simular remuneracao do vendedor:', erro);
    return res.status(500).json({ erro: 'Erro ao simular remuneracao do vendedor' });
  }
};

const normalizarTexto = (valor = '') => {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
};

const calcularTotalComissaoVendedor = (vendedor = {}) => {
  const vendas = Number(vendedor.vendas?.comissao) || 0;
  const churn = Number(vendedor.churn?.comissao) || 0;
  const mudanca = Number(vendedor.mudancaTitularidade?.comissao) || 0;
  const migracao = Number(vendedor.migracaoTecnologia?.comissao) || 0;
  const renovacao = Number(vendedor.renovacao?.comissao) || 0;
  const planoEvento = Number(vendedor.planoEvento?.comissao) || 0;
  const sva = Number(vendedor.sva?.comissao) || 0;
  const telefonia = Number(vendedor.telefonia?.comissao) || 0;
  return vendas + churn + mudanca + migracao + renovacao + planoEvento + sva + telefonia;
};

const extrairTipoLideranca = (funcaoNome = '', regionalNome = '', regionalId = null) => {
  const nome = normalizarTexto(funcaoNome);
  const regional = normalizarTexto(regionalNome);
  if (nome.includes('gerente regional')) return 'GERENTE_REGIONAL';
  if (nome.includes('supervisor comercial') || nome.includes('supervisor regional')) return 'SUPERVISOR_COMERCIAL';
  if (nome.includes('gerente da matriz') || nome.includes('gerente matriz')) return 'GERENTE_MATRIZ';
  if (nome.includes('gerente') && (nome.includes('matriz') || !regionalId || regional.includes('matriz'))) {
    return 'GERENTE_MATRIZ';
  }
  return null;
};

const obterVendedoresRegional = async (periodo, regionalId, filtroPerfilVendedor = PERFIL_VENDEDOR_FILTRO.TODOS) => {
  return new Promise((resolve, reject) => {
    const reqMock = { query: { periodo, regionalId, filtroPerfilVendedor } };
    const resMock = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        if (this.statusCode >= 400) {
          const erro = new Error(payload?.erro || 'Falha ao obter vendedores');
          erro.statusCode = this.statusCode;
          return reject(erro);
        }
        return resolve(payload || { vendedores: [] });
      }
    };

    exports.listarVendedores(reqMock, resMock).catch(reject);
  });
};

/**
 * GET /api/comissionamento/liderancas?periodo=Jan/25
 * Regras:
 * - Gerente Regional = 1.2 x media da comissao dos vendedores da regional
 * - Supervisor Comercial = 1.0 x media da comissao dos vendedores da regional
 * - Gerente da Matriz = 2.4 x media das medias das regionais
 */
exports.listarLiderancas = async (req, res) => {
  try {
    const { periodo } = req.query;

    if (!periodo) {
      return res.status(400).json({ erro: 'Periodo e obrigatorio' });
    }

    const regionais = await db_all('SELECT id, nome FROM regionais ORDER BY nome');
    const mediasRegionais = [];

    for (const regional of regionais) {
      try {
        const dadosRegional = await obterVendedoresRegional(periodo, regional.id);
        const vendedores = Array.isArray(dadosRegional?.vendedores) ? dadosRegional.vendedores : [];
        const totais = vendedores.map(calcularTotalComissaoVendedor);
        const somaComissao = totais.reduce((acc, valor) => acc + valor, 0);
        const qtdBaseMedia = Number(dadosRegional?.qtdVendedoresFte) || totais.length || 0;
        const mediaComissao = qtdBaseMedia > 0 ? somaComissao / qtdBaseMedia : 0;

        mediasRegionais.push({
          regionalId: regional.id,
          regionalNome: regional.nome,
          qtdVendedores: qtdBaseMedia,
          somaComissao,
          mediaComissao
        });
      } catch (erroRegional) {
        mediasRegionais.push({
          regionalId: regional.id,
          regionalNome: regional.nome,
          qtdVendedores: 0,
          somaComissao: 0,
          mediaComissao: 0
        });
      }
    }

    const mediasValidas = mediasRegionais.filter((item) => item.qtdVendedores > 0);
    const mediaComissaoRegionais = mediasValidas.length > 0
      ? mediasValidas.reduce((acc, item) => acc + item.mediaComissao, 0) / mediasValidas.length
      : 0;

    const colaboradores = await db_all(`
      SELECT
        c.id,
        c.nome,
        c.regional_id,
        c.status,
        c.data_ativacao,
        c.data_inativacao,
        r.nome AS regional_nome,
        f.nome AS funcao_nome
      FROM colaboradores c
      LEFT JOIN regionais r ON r.id = c.regional_id
      LEFT JOIN funcoes f ON f.id = c.funcao_id
      ORDER BY c.nome
    `);
    const colaboradoresAtivosNoPeriodo = colaboradores.filter((c) => estaAtivoNoPeriodo(c, periodo));

    const regraConfigurada = await ComissaoLiderancaRegra.obterPorPeriodo(periodo);
    const regrasMultiplicador = {
      GERENTE_REGIONAL: Number(regraConfigurada.gerenteRegionalMultiplier) || 1.2,
      SUPERVISOR_COMERCIAL: Number(regraConfigurada.supervisorRegionalMultiplier) || 1.0,
      GERENTE_MATRIZ: Number(regraConfigurada.gerenteMatrizMultiplier) || 2.4
    };

    const liderancas = colaboradoresAtivosNoPeriodo
      .map((colaborador) => {
        const tipoLideranca = extrairTipoLideranca(
          colaborador.funcao_nome,
          colaborador.regional_nome,
          colaborador.regional_id
        );
        if (!tipoLideranca) return null;

        const multiplicador = regrasMultiplicador[tipoLideranca] || 0;
        let baseMedia = 0;

        if (tipoLideranca === 'GERENTE_MATRIZ') {
          baseMedia = mediaComissaoRegionais;
        } else {
          const baseRegional = mediasRegionais.find((item) => item.regionalId === colaborador.regional_id);
          baseMedia = baseRegional?.mediaComissao || 0;
        }

        return {
          colaboradorId: colaborador.id,
          nome: colaborador.nome,
          funcaoNome: colaborador.funcao_nome,
          tipoLideranca,
          regionalId: colaborador.regional_id || null,
          regionalNome: colaborador.regional_nome || null,
          baseMedia,
          multiplicador,
          comissao: baseMedia * multiplicador
        };
      })
      .filter(Boolean);

    return res.json({
      periodo,
      regras: regrasMultiplicador,
      mediasRegionais,
      mediaComissaoRegionais,
      liderancas
    });
  } catch (erro) {
    console.error('Erro ao listar comissionamento de liderancas:', erro);
    return res.status(500).json({ erro: 'Erro ao listar comissionamento de liderancas' });
  }
};

const obterLiderancasPeriodo = async (periodo) => {
  return new Promise((resolve, reject) => {
    const reqMock = { query: { periodo } };
    const resMock = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        if (this.statusCode >= 400) {
          const erro = new Error(payload?.erro || 'Falha ao obter liderancas');
          erro.statusCode = this.statusCode;
          return reject(erro);
        }
        return resolve(payload || { liderancas: [] });
      }
    };

    exports.listarLiderancas(reqMock, resMock).catch(reject);
  });
};

const arredondarMonetario = (valor) => {
  const numero = Number(valor) || 0;
  return Math.round(numero * 100) / 100;
};

const MESES_ORDEM = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12
};

const parsePeriodoValor = (periodo) => {
  const [mesTxt, anoTxt] = String(periodo || '').split('/');
  if (!mesTxt || !anoTxt) return null;
  const mes = MESES_ORDEM[normalizarTexto(mesTxt)];
  const anoNum = Number(anoTxt);
  if (!mes || Number.isNaN(anoNum)) return null;
  const ano = anoNum < 100 ? 2000 + anoNum : anoNum;
  return { mes, ano, ordem: ano * 100 + mes };
};

const filtrarPeriodosIntervalo = (periodos = [], periodoInicio, periodoFim) => {
  const inicio = parsePeriodoValor(periodoInicio);
  const fim = parsePeriodoValor(periodoFim);
  return periodos.filter((item) => {
    const atual = parsePeriodoValor(item);
    if (!atual) return false;
    if (inicio && atual.ordem < inicio.ordem) return false;
    if (fim && atual.ordem > fim.ordem) return false;
    return true;
  });
};

const isPeriodoMesVigente = (periodo) => {
  const parsed = parsePeriodoValor(periodo);
  if (!parsed) return false;
  const hoje = new Date();
  return parsed.ano === hoje.getFullYear() && parsed.mes === (hoje.getMonth() + 1);
};

const contarDiasUteisMesPeriodo = (periodo) => {
  const parsed = parsePeriodoValor(periodo);
  if (!parsed) return 0;
  const mesIndex = parsed.mes - 1;
  const ultimoDia = new Date(parsed.ano, parsed.mes, 0).getDate();
  let count = 0;
  for (let d = 1; d <= ultimoDia; d += 1) {
    const day = new Date(parsed.ano, mesIndex, d).getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
};

const contarDiasUteisPassadosPeriodo = (periodo) => {
  const parsed = parsePeriodoValor(periodo);
  if (!parsed) return 0;

  const hoje = new Date();
  const ordemPeriodo = parsed.ano * 100 + parsed.mes;
  const ordemHoje = hoje.getFullYear() * 100 + (hoje.getMonth() + 1);

  if (ordemPeriodo < ordemHoje) return contarDiasUteisMesPeriodo(periodo);
  if (ordemPeriodo > ordemHoje) return 0;

  const mesIndex = parsed.mes - 1;
  let count = 0;
  for (let d = 1; d <= hoje.getDate(); d += 1) {
    const day = new Date(parsed.ano, mesIndex, d).getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
};

const fatorProjecaoMesVigente = (periodo) => {
  if (!isPeriodoMesVigente(periodo)) return 1;
  const duTotal = contarDiasUteisMesPeriodo(periodo);
  const duPassado = contarDiasUteisPassadosPeriodo(periodo);
  if (duTotal <= 0 || duPassado <= 0) return 1;
  return duTotal / duPassado;
};

/**
 * GET /api/comissionamento/relatorio-rh?periodo=Jan/26&regionalId=<opcional>
 * Relatorio oficial para RH:
 * - todos os colaboradores com comissao no periodo (vendedores + liderancas)
 * - classificado por regional e cargo
 * - subtotal por regional
 * - total geral
 * - DSR calculado sobre a comissao (padrao 1/6)
 */
exports.listarRelatorioRH = async (req, res) => {
  try {
    const { periodo, regionalId } = req.query;
    if (!periodo) {
      return res.status(400).json({ erro: 'Periodo e obrigatorio' });
    }

    const regionais = await db_all('SELECT id, nome FROM regionais ORDER BY nome');
    const regionaisFiltradas = regionalId
      ? regionais.filter((regional) => regional.id === regionalId)
      : regionais;

    const linhas = [];
    let totalVendedoresFte = 0;

    for (const regional of regionaisFiltradas) {
      let dadosRegional = { vendedores: [] };
      try {
        dadosRegional = await obterVendedoresRegional(periodo, regional.id);
      } catch (erroRegional) {
        dadosRegional = { vendedores: [] };
      }

      const vendedores = Array.isArray(dadosRegional?.vendedores) ? dadosRegional.vendedores : [];
      totalVendedoresFte += Number(dadosRegional?.qtdVendedoresFte) || 0;
      vendedores.forEach((vendedor) => {
        const comissao = arredondarMonetario(calcularTotalComissaoVendedor(vendedor));
        const dsr = arredondarMonetario(comissao / DSR_DIVISOR_PADRAO);
        const totalComDsr = arredondarMonetario(comissao + dsr);

        linhas.push({
          colaboradorId: vendedor.id,
          nome: vendedor.nome,
          cargo: vendedor.funcaoNome || 'Vendedor',
          tipoColaborador: 'VENDEDOR',
          regionalId: regional.id,
          regionalNome: regional.nome,
          comissao,
          dsr,
          totalComDsr
        });
      });
    }

    const dadosLiderancas = await obterLiderancasPeriodo(periodo);
    const liderancas = Array.isArray(dadosLiderancas?.liderancas) ? dadosLiderancas.liderancas : [];

    liderancas.forEach((lideranca) => {
      if (regionalId && lideranca.tipoLideranca !== 'GERENTE_MATRIZ' && lideranca.regionalId !== regionalId) {
        return;
      }

      const comissao = arredondarMonetario(lideranca.comissao || 0);
      const dsr = arredondarMonetario(comissao / DSR_DIVISOR_PADRAO);
      const totalComDsr = arredondarMonetario(comissao + dsr);

      linhas.push({
        colaboradorId: lideranca.colaboradorId,
        nome: lideranca.nome,
        cargo: lideranca.funcaoNome || 'Lideranca',
        tipoColaborador: 'LIDERANCA',
        regionalId: lideranca.regionalId || null,
        regionalNome: lideranca.regionalNome || 'Matriz',
        comissao,
        dsr,
        totalComDsr
      });
    });

    linhas.sort((a, b) => {
      const regComp = String(a.regionalNome || '').localeCompare(String(b.regionalNome || ''), 'pt-BR');
      if (regComp !== 0) return regComp;
      const cargoComp = String(a.cargo || '').localeCompare(String(b.cargo || ''), 'pt-BR');
      if (cargoComp !== 0) return cargoComp;
      return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
    });

    const mapRegional = new Map();
    for (const linha of linhas) {
      const chaveRegional = linha.regionalId || `matriz-${linha.regionalNome}`;
      if (!mapRegional.has(chaveRegional)) {
        mapRegional.set(chaveRegional, {
          regionalId: linha.regionalId,
          regionalNome: linha.regionalNome,
          cargosMap: new Map(),
          subtotalComissao: 0,
          subtotalDsr: 0,
          subtotalTotalComDsr: 0,
          quantidadeColaboradores: 0
        });
      }

      const regional = mapRegional.get(chaveRegional);
      regional.subtotalComissao += linha.comissao;
      regional.subtotalDsr += linha.dsr;
      regional.subtotalTotalComDsr += linha.totalComDsr;
      regional.quantidadeColaboradores += 1;

      const chaveCargo = linha.cargo || 'Sem cargo';
      if (!regional.cargosMap.has(chaveCargo)) {
        regional.cargosMap.set(chaveCargo, {
          cargo: chaveCargo,
          linhas: [],
          subtotalComissao: 0,
          subtotalDsr: 0,
          subtotalTotalComDsr: 0,
          quantidadeColaboradores: 0
        });
      }

      const cargo = regional.cargosMap.get(chaveCargo);
      cargo.linhas.push(linha);
      cargo.subtotalComissao += linha.comissao;
      cargo.subtotalDsr += linha.dsr;
      cargo.subtotalTotalComDsr += linha.totalComDsr;
      cargo.quantidadeColaboradores += 1;
    }

    for (const regional of regionaisFiltradas) {
      const chaveRegional = regional.id;
      if (!mapRegional.has(chaveRegional)) {
        mapRegional.set(chaveRegional, {
          regionalId: regional.id,
          regionalNome: regional.nome,
          cargosMap: new Map(),
          subtotalComissao: 0,
          subtotalDsr: 0,
          subtotalTotalComDsr: 0,
          quantidadeColaboradores: 0
        });
      }
    }

    const agrupadoPorRegional = Array.from(mapRegional.values())
      .map((regional) => ({
        regionalId: regional.regionalId,
        regionalNome: regional.regionalNome,
        quantidadeColaboradores: regional.quantidadeColaboradores,
        subtotalComissao: arredondarMonetario(regional.subtotalComissao),
        subtotalDsr: arredondarMonetario(regional.subtotalDsr),
        subtotalTotalComDsr: arredondarMonetario(regional.subtotalTotalComDsr),
        cargos: Array.from(regional.cargosMap.values())
          .map((cargo) => ({
            cargo: cargo.cargo,
            quantidadeColaboradores: cargo.quantidadeColaboradores,
            subtotalComissao: arredondarMonetario(cargo.subtotalComissao),
            subtotalDsr: arredondarMonetario(cargo.subtotalDsr),
            subtotalTotalComDsr: arredondarMonetario(cargo.subtotalTotalComDsr),
            linhas: cargo.linhas
          }))
          .sort((a, b) => a.cargo.localeCompare(b.cargo, 'pt-BR'))
      }))
      .sort((a, b) => a.regionalNome.localeCompare(b.regionalNome, 'pt-BR'));

    const totalGeralComissao = arredondarMonetario(
      agrupadoPorRegional.reduce((acc, item) => acc + item.subtotalComissao, 0)
    );
    const totalGeralDsr = arredondarMonetario(
      agrupadoPorRegional.reduce((acc, item) => acc + item.subtotalDsr, 0)
    );
    const totalGeralComDsr = arredondarMonetario(
      agrupadoPorRegional.reduce((acc, item) => acc + item.subtotalTotalComDsr, 0)
    );
    const totalColaboradores = agrupadoPorRegional.reduce(
      (acc, item) => acc + item.quantidadeColaboradores,
      0
    );
    const totalVendedoresHeadcount = linhas.filter((item) => item.tipoColaborador === 'VENDEDOR').length;
    const totalVendedores = totalVendedoresFte > 0
      ? arredondarMonetario(totalVendedoresFte)
      : totalVendedoresHeadcount;
    const totalLiderancas = linhas.filter((item) => item.tipoColaborador === 'LIDERANCA').length;

    return res.json({
      periodo,
      dsrDivisor: DSR_DIVISOR_PADRAO,
      totalColaboradores,
      totalVendedores,
      totalVendedoresHeadcount,
      totalVendedoresFte: arredondarMonetario(totalVendedoresFte),
      totalLiderancas,
      totalGeralComissao,
      totalGeralDsr,
      totalGeralComDsr,
      agrupadoPorRegional
    });
  } catch (erro) {
    console.error('Erro ao montar relatorio RH:', erro);
    return res.status(500).json({ erro: 'Erro ao montar relatorio RH' });
  }
};

/**
 * GET /api/comissionamento/dashboard-variavel?periodoInicio=Dez/25&periodoFim=Fev/26
 * Dashboard com visao mensal de remuneracao variavel.
 */
exports.listarDashboardVariavel = async (req, res) => {
  try {
    const { periodoInicio, periodoFim } = req.query;
    const filtroPerfilVendedor = normalizarFiltroPerfilVendedor(
      req.query?.filtroPerfilVendedor || req.query?.perfilVendedor || req.query?.perfil
    );

    const periodosBrutos = await db_all(
      'SELECT DISTINCT periodo FROM vendas_mensais WHERE periodo IS NOT NULL AND TRIM(periodo) <> \'\''
    );

    const periodosOrdenados = periodosBrutos
      .map((item) => item.periodo)
      .filter(Boolean)
      .filter((p) => parsePeriodoValor(p))
      .sort((a, b) => parsePeriodoValor(a).ordem - parsePeriodoValor(b).ordem);

    const periodos = filtrarPeriodosIntervalo(periodosOrdenados, periodoInicio, periodoFim);

    if (periodos.length === 0) {
        return res.json({
          periodoInicio: periodoInicio || null,
          periodoFim: periodoFim || null,
          filtroPerfilVendedor,
          periodosDisponiveis: periodosOrdenados,
          periodos: [],
          serieMensal: [],
        composicaoTiposUltimoMes: [],
        rankingRegionalUltimoMes: [],
        indicadoresAtuais: null
      });
    }

    const serieMensal = [];
    const serieRegionalMensal = [];
    const serieTipoMensal = [];
    const serieRegionalTipoMensal = [];
    const serieTipoMensalQuantidade = [];
    const serieRegionalTipoMensalQuantidade = [];
    let composicaoTiposUltimoMes = [];
    let rankingRegionalUltimoMes = [];
    let composicaoTiposPorRegionalUltimoMes = [];
    let rankingRegionalPorTipoUltimoMes = [];

    for (const periodo of periodos) {
      const regionais = await db_all('SELECT id, nome FROM regionais ORDER BY nome');
      const fatorProjecao = fatorProjecaoMesVigente(periodo);
      const aplicarProjecaoMesVigente = fatorProjecao > 1;

      let totalComissaoVendedores = 0;
      let qtdVendedores = 0;
      let qtdVendedoresFte = 0;
      const tipos = {
        vendas: 0,
        churn: 0,
        mudancaTitularidade: 0,
        migracaoTecnologia: 0,
        renovacao: 0,
        planoEvento: 0,
        sva: 0,
        telefonia: 0
      };
      const tiposQuantidade = {
        vendas: 0,
        churn: 0,
        mudancaTitularidade: 0,
        migracaoTecnologia: 0,
        renovacao: 0,
        planoEvento: 0,
        sva: 0,
        telefonia: 0
      };

      const regionalMap = new Map();
      const regionalTipoMap = new Map();
      const regionalTipoQuantidadeMap = new Map();

      for (const regional of regionais) {
        const dadosRegional = await obterVendedoresRegional(
          periodo,
          regional.id,
          filtroPerfilVendedor
        ).catch(() => ({ vendedores: [] }));
        const vendedores = Array.isArray(dadosRegional?.vendedores) ? dadosRegional.vendedores : [];
        qtdVendedoresFte += Number(dadosRegional?.qtdVendedoresFte) || 0;

        let subtotalRegional = 0;
        const subtotalRegionalTipos = {
          vendas: 0,
          churn: 0,
          mudancaTitularidade: 0,
          migracaoTecnologia: 0,
          renovacao: 0,
          planoEvento: 0,
          sva: 0,
          telefonia: 0
        };
        const subtotalRegionalTiposQuantidade = {
          vendas: 0,
          churn: 0,
          mudancaTitularidade: 0,
          migracaoTecnologia: 0,
          renovacao: 0,
          planoEvento: 0,
          sva: 0,
          telefonia: 0
        };

        const fatorValor = aplicarProjecaoMesVigente ? fatorProjecao : 1;
        vendedores.forEach((vendedor) => {
          const vendas = (Number(vendedor.vendas?.comissao) || 0) * fatorValor;
          const churn = (Number(vendedor.churn?.comissao) || 0) * fatorValor;
          const mudanca = (Number(vendedor.mudancaTitularidade?.comissao) || 0) * fatorValor;
          const migracao = (Number(vendedor.migracaoTecnologia?.comissao) || 0) * fatorValor;
          const renovacao = (Number(vendedor.renovacao?.comissao) || 0) * fatorValor;
          const planoEvento = (Number(vendedor.planoEvento?.comissao) || 0) * fatorValor;
          const sva = (Number(vendedor.sva?.comissao) || 0) * fatorValor;
          const telefonia = (Number(vendedor.telefonia?.comissao) || 0) * fatorValor;
          const qtdVendas = (Number(vendedor.vendas?.quantidade) || 0) * fatorValor;
          const qtdChurn = (Number(vendedor.churn?.quantidade) || 0) * fatorValor;
          const qtdMudanca = (Number(vendedor.mudancaTitularidade?.quantidade) || 0) * fatorValor;
          const qtdMigracao = (Number(vendedor.migracaoTecnologia?.quantidade) || 0) * fatorValor;
          const qtdRenovacao = (Number(vendedor.renovacao?.quantidade) || 0) * fatorValor;
          const qtdPlanoEvento = (Number(vendedor.planoEvento?.quantidade) || 0) * fatorValor;
          const qtdSva = (Number(vendedor.sva?.quantidade) || 0) * fatorValor;
          const qtdTelefonia = (Number(vendedor.telefonia?.quantidade) || 0) * fatorValor;

          const totalVendedor = vendas + churn + mudanca + migracao + renovacao + planoEvento + sva + telefonia;
          subtotalRegional += totalVendedor;
          totalComissaoVendedores += totalVendedor;
          qtdVendedores += 1;

          tipos.vendas += vendas;
          tipos.churn += churn;
          tipos.mudancaTitularidade += mudanca;
          tipos.migracaoTecnologia += migracao;
          tipos.renovacao += renovacao;
          tipos.planoEvento += planoEvento;
          tipos.sva += sva;
          tipos.telefonia += telefonia;
          tiposQuantidade.vendas += qtdVendas;
          tiposQuantidade.churn += qtdChurn;
          tiposQuantidade.mudancaTitularidade += qtdMudanca;
          tiposQuantidade.migracaoTecnologia += qtdMigracao;
          tiposQuantidade.renovacao += qtdRenovacao;
          tiposQuantidade.planoEvento += qtdPlanoEvento;
          tiposQuantidade.sva += qtdSva;
          tiposQuantidade.telefonia += qtdTelefonia;

          subtotalRegionalTipos.vendas += vendas;
          subtotalRegionalTipos.churn += churn;
          subtotalRegionalTipos.mudancaTitularidade += mudanca;
          subtotalRegionalTipos.migracaoTecnologia += migracao;
          subtotalRegionalTipos.renovacao += renovacao;
          subtotalRegionalTipos.planoEvento += planoEvento;
          subtotalRegionalTipos.sva += sva;
          subtotalRegionalTipos.telefonia += telefonia;
          subtotalRegionalTiposQuantidade.vendas += qtdVendas;
          subtotalRegionalTiposQuantidade.churn += qtdChurn;
          subtotalRegionalTiposQuantidade.mudancaTitularidade += qtdMudanca;
          subtotalRegionalTiposQuantidade.migracaoTecnologia += qtdMigracao;
          subtotalRegionalTiposQuantidade.renovacao += qtdRenovacao;
          subtotalRegionalTiposQuantidade.planoEvento += qtdPlanoEvento;
          subtotalRegionalTiposQuantidade.sva += qtdSva;
          subtotalRegionalTiposQuantidade.telefonia += qtdTelefonia;
        });

        const atualRegional = regionalMap.get(regional.nome) || {
          valor: 0,
          qtdVendedores: 0,
          qtdVendedoresFte: 0
        };
        atualRegional.valor += subtotalRegional;
        atualRegional.qtdVendedores += vendedores.length;
        atualRegional.qtdVendedoresFte += Number(dadosRegional?.qtdVendedoresFte) || 0;
        regionalMap.set(regional.nome, atualRegional);
        regionalTipoMap.set(regional.nome, subtotalRegionalTipos);
        regionalTipoQuantidadeMap.set(regional.nome, subtotalRegionalTiposQuantidade);
      }

      const dadosLiderancas = await obterLiderancasPeriodo(periodo).catch(() => ({ liderancas: [] }));
      const liderancas = Array.isArray(dadosLiderancas?.liderancas) ? dadosLiderancas.liderancas : [];
      const totalComissaoLiderancasReal = liderancas.reduce(
        (acc, item) => acc + (Number(item.comissao) || 0),
        0
      );
      const totalComissaoLiderancas = aplicarProjecaoMesVigente
        ? (totalComissaoLiderancasReal * fatorProjecao)
        : totalComissaoLiderancasReal;

      const totalComissaoGeral = totalComissaoVendedores + totalComissaoLiderancas;
      const totalDsr = totalComissaoGeral / DSR_DIVISOR_PADRAO;
      const baseTicketVendedores = qtdVendedoresFte > 0 ? qtdVendedoresFte : qtdVendedores;
      const ticketMedioVendedor = baseTicketVendedores > 0 ? totalComissaoVendedores / baseTicketVendedores : 0;

      const periodoInfo = parsePeriodoValor(periodo);
      serieMensal.push({
        periodo,
        ordem: periodoInfo.ordem,
        comissaoVendedores: arredondarMonetario(totalComissaoVendedores),
        comissaoLiderancas: arredondarMonetario(totalComissaoLiderancas),
        comissaoTotal: arredondarMonetario(totalComissaoGeral),
        dsrTotal: arredondarMonetario(totalDsr),
        ticketMedioVendedor: arredondarMonetario(ticketMedioVendedor),
        qtdVendedores,
        qtdVendedoresFte: arredondarMonetario(qtdVendedoresFte),
        qtdLiderancas: liderancas.length
      });

      Array.from(regionalMap.entries()).forEach(([regionalNome, info]) => {
        serieRegionalMensal.push({
          periodo,
          ordem: periodoInfo.ordem,
          regionalNome,
          valor: arredondarMonetario(info.valor),
          qtdVendedores: info.qtdVendedores,
          qtdVendedoresFte: arredondarMonetario(info.qtdVendedoresFte)
        });
      });

      Object.entries(tipos).forEach(([tipo, valor]) => {
        serieTipoMensal.push({
          periodo,
          ordem: periodoInfo.ordem,
          tipo,
          valor: arredondarMonetario(valor)
        });
      });
      Object.entries(tiposQuantidade).forEach(([tipo, quantidade]) => {
        serieTipoMensalQuantidade.push({
          periodo,
          ordem: periodoInfo.ordem,
          tipo,
          quantidade: arredondarMonetario(quantidade)
        });
      });

      Array.from(regionalTipoMap.entries()).forEach(([regionalNome, tiposRegional]) => {
        Object.entries(tiposRegional).forEach(([tipo, valor]) => {
          serieRegionalTipoMensal.push({
            periodo,
            ordem: periodoInfo.ordem,
            regionalNome,
            tipo,
            valor: arredondarMonetario(valor)
          });
        });
      });
      Array.from(regionalTipoQuantidadeMap.entries()).forEach(([regionalNome, tiposRegionalQuantidade]) => {
        Object.entries(tiposRegionalQuantidade).forEach(([tipo, quantidade]) => {
          serieRegionalTipoMensalQuantidade.push({
            periodo,
            ordem: periodoInfo.ordem,
            regionalNome,
            tipo,
            quantidade: arredondarMonetario(quantidade)
          });
        });
      });

      if (periodo === periodos[periodos.length - 1]) {
        composicaoTiposUltimoMes = Object.entries(tipos).map(([tipo, valor]) => ({
          tipo,
          valor: arredondarMonetario(valor)
        }));

        rankingRegionalUltimoMes = Array.from(regionalMap.entries())
          .map(([regionalNome, info]) => ({
            regionalNome,
            valor: arredondarMonetario(info.valor),
            qtdVendedores: info.qtdVendedores,
            qtdVendedoresFte: arredondarMonetario(info.qtdVendedoresFte)
          }))
          .sort((a, b) => b.valor - a.valor);

        composicaoTiposPorRegionalUltimoMes = Array.from(regionalTipoMap.entries())
          .flatMap(([regionalNome, tiposRegional]) =>
            Object.entries(tiposRegional).map(([tipo, valor]) => ({
              regionalNome,
              tipo,
              valor: arredondarMonetario(valor)
            }))
          );

        rankingRegionalPorTipoUltimoMes = Object.keys(tipos).flatMap((tipo) =>
          Array.from(regionalTipoMap.entries()).map(([regionalNome, tiposRegional]) => ({
            tipo,
            regionalNome,
            valor: arredondarMonetario(tiposRegional[tipo] || 0)
          }))
        );
      }
    }

    const serieOrdenada = serieMensal.sort((a, b) => a.ordem - b.ordem);
    const ultimo = serieOrdenada[serieOrdenada.length - 1];
    const anterior = serieOrdenada.length > 1 ? serieOrdenada[serieOrdenada.length - 2] : null;
    const variacaoMensal = anterior && anterior.comissaoTotal > 0
      ? ((ultimo.comissaoTotal - anterior.comissaoTotal) / anterior.comissaoTotal) * 100
      : null;

    return res.json({
      periodoInicio: periodoInicio || periodos[0],
      periodoFim: periodoFim || periodos[periodos.length - 1],
      filtroPerfilVendedor,
      periodosDisponiveis: periodosOrdenados,
      periodos,
      indicadoresAtuais: ultimo
        ? {
            ...ultimo,
            variacaoMensalPercent: variacaoMensal !== null ? arredondarMonetario(variacaoMensal) : null
          }
        : null,
      serieMensal: serieOrdenada,
      serieRegionalMensal,
      serieTipoMensal,
      serieRegionalTipoMensal,
      serieTipoMensalQuantidade,
      serieRegionalTipoMensalQuantidade,
      composicaoTiposUltimoMes,
      rankingRegionalUltimoMes,
      composicaoTiposPorRegionalUltimoMes,
      rankingRegionalPorTipoUltimoMes
    });
  } catch (erro) {
    console.error('Erro ao montar dashboard variavel:', erro);
    return res.status(500).json({ erro: 'Erro ao montar dashboard variavel' });
  }
};




