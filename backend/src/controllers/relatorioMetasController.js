const { db_all } = require('../config/database');

const normalizarPercentual = (valor) => {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return 0;
  return numero >= 1 ? numero / 100 : numero;
};

const FILTRO_EXCLUIR_LIDERANCAS = `
  COALESCE(LOWER(f.nome), '') NOT LIKE '%gerente regional%'
  AND COALESCE(LOWER(f.nome), '') NOT LIKE '%gerente da matriz%'
  AND COALESCE(LOWER(f.nome), '') NOT LIKE '%gerente matriz%'
  AND COALESCE(LOWER(f.nome), '') NOT LIKE '%supervisor comercial%'
  AND COALESCE(LOWER(f.nome), '') NOT LIKE '%supervisor regional%'
`;

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

const EXPRESSAO_VOLUME_TOTAL = `
  COALESCE(vendas_volume, 0)
  + COALESCE(mudanca_titularidade_volume, 0)
  + COALESCE(migracao_tecnologia_volume, 0)
  + COALESCE(renovacao_volume, 0)
  + COALESCE(plano_evento_volume, 0)
  + COALESCE(sva_volume, 0)
  + COALESCE(telefonia_volume, 0)
`;

const obterBaseMetaRegionalPeriodo = async ({
  regionalId,
  periodo,
  colaboradoresElegiveis = [],
  cache = new Map()
}) => {
  const chave = `${regionalId}::${periodo}`;
  if (cache.has(chave)) return cache.get(chave);

  const headcount = colaboradoresElegiveis.filter((colab) =>
    colab.regional_id === regionalId && estaAtivoNoPeriodo(colab, periodo)
  ).length;

  const vendasPeriodo = await db_all(`
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
      vp.vendedor_id,
      vp.volume_regional,
      tv.volume_total_periodo
    FROM vendas_periodo vp
    INNER JOIN totais_vendedor tv ON tv.vendedor_id = vp.vendedor_id
    WHERE vp.regional_id = ?
  `, [periodo, regionalId]);

  const fte = vendasPeriodo.reduce((acc, row) => {
    const colaborador = colaboradoresElegiveis.find((c) => c.id === row.vendedor_id);
    if (!colaborador || !estaAtivoNoPeriodo(colaborador, periodo)) return acc;
    const volumeRegional = Number(row.volume_regional) || 0;
    const volumeTotal = Number(row.volume_total_periodo) || 0;
    if (volumeRegional <= 0 || volumeTotal <= 0) return acc;
    return acc + (volumeRegional / volumeTotal);
  }, 0);

  const base = fte > 0 ? fte : headcount;
  const resultado = { headcount, fte, base };
  cache.set(chave, resultado);
  return resultado;
};

exports.obterMetasIndividualizadas = async (req, res) => {
  try {
    // Busca todas as regionais
    const regionais = await db_all(`SELECT id, nome FROM regionais ORDER BY nome`);

    // Busca todas as regras de comissÃ£o
    const regras = await db_all(`
      SELECT 
        id, 
        regionalId, 
        tipoMeta,
        periodo,
        meta1Volume, meta1Percent,
        meta2Volume, meta2Percent,
        meta3Volume, meta3Percent,
        meta1PercentIndividual,
        meta2PercentIndividual,
        meta3PercentIndividual,
        incrementoGlobal,
        pesoVendasChurn
      FROM regras_comissao
      ORDER BY regionalId, tipoMeta
    `);

    // Busca somente vendedores ativos (mesma regra do resumo de comissionamento)
    const colaboradores = await db_all(`
      SELECT c.id, c.nome, c.regional_id, c.status, c.data_ativacao, c.data_inativacao
      FROM colaboradores c
      LEFT JOIN funcoes f ON f.id = c.funcao_id
      WHERE ${FILTRO_EXCLUIR_LIDERANCAS}
    `);

    // Agrupa regras por regional
    const ragrasPorRegional = {};
    regras.forEach(regra => {
      if (!ragrasPorRegional[regra.regionalId]) {
        ragrasPorRegional[regra.regionalId] = [];
      }
      ragrasPorRegional[regra.regionalId].push(regra);
    });

    const baseCache = new Map();

    // Monta o relatÃ³rio
    const relatorio = regionais.map(regional => {
      const metasRegionais = ragrasPorRegional[regional.id] || [];
      const periodoReferencia = metasRegionais[0]?.periodo || null;

      return {
        id: regional.id,
        nome: regional.nome,
        totalVendedores: colaboradores.filter((colab) =>
          colab.regional_id === regional.id && estaAtivoNoPeriodo(colab, periodoReferencia)
        ).length,
        metas: metasRegionais.map(async (meta) => {
          const baseRegional = await obterBaseMetaRegionalPeriodo({
            regionalId: regional.id,
            periodo: meta.periodo,
            colaboradoresElegiveis: colaboradores,
            cache: baseCache
          });

          const incremento = normalizarPercentual(meta.incrementoGlobal);
          const fatorIncremento = 1 + incremento;

          // Calcula a meta individual: (meta_regional / total_vendedores) * (1 + incremento)
          const metaIndividual1 = baseRegional.base > 0 
            ? (meta.meta1Volume / baseRegional.base) * fatorIncremento
            : 0;
          const metaIndividual2 = baseRegional.base > 0 
            ? (meta.meta2Volume / baseRegional.base) * fatorIncremento
            : 0;
          const metaIndividual3 = baseRegional.base > 0 
            ? (meta.meta3Volume / baseRegional.base) * fatorIncremento
            : 0;

          const percentual1 = normalizarPercentual(meta.meta1Percent);
          const percentual2 = normalizarPercentual(meta.meta2Percent);
          const percentual3 = normalizarPercentual(meta.meta3Percent);
          const percentualIndividual1 = normalizarPercentual(meta.meta1PercentIndividual);
          const percentualIndividual2 = normalizarPercentual(meta.meta2PercentIndividual);
          const percentualIndividual3 = normalizarPercentual(meta.meta3PercentIndividual);
          return {
            id: meta.id,
            tipoMeta: meta.tipoMeta,
            periodo: meta.periodo,
            baseMetaIndividual: {
              tipo: baseRegional.fte > 0 ? 'FTE' : 'HEADCOUNT',
              valor: Math.round(baseRegional.base * 100) / 100,
              headcount: baseRegional.headcount,
              fte: Math.round(baseRegional.fte * 100) / 100
            },
            
            metaRegional1: meta.meta1Volume,
            metaRegional2: meta.meta2Volume,
            metaRegional3: meta.meta3Volume,
            
            metaIndividual1: Math.round(metaIndividual1 * 100) / 100,
            metaIndividual2: Math.round(metaIndividual2 * 100) / 100,
            metaIndividual3: Math.round(metaIndividual3 * 100) / 100,
            
            percentual1: (percentual1 * 100).toFixed(2),
            percentual2: (percentual2 * 100).toFixed(2),
            percentual3: (percentual3 * 100).toFixed(2),
            percentualIndividual1: (percentualIndividual1 * 100).toFixed(2),
            percentualIndividual2: (percentualIndividual2 * 100).toFixed(2),
            percentualIndividual3: (percentualIndividual3 * 100).toFixed(2),
            
            incrementoGlobal: (incremento * 100).toFixed(2)
          };
        })
      };
    });
    const relatorioResolvido = await Promise.all(
      relatorio.map(async (regional) => ({
        ...regional,
        metas: await Promise.all(regional.metas)
      }))
    );

    res.json(relatorioResolvido);
  } catch (error) {
    console.error('Erro ao obter metas individualizadas:', error);
    res.status(500).json({ erro: 'Erro ao obter metas: ' + error.message });
  }
};

exports.obterMetasIndividualizadasPorRegional = async (req, res) => {
  try {
    const { regionalId } = req.params;

    // Busca a regional especÃ­fica
    const regional = await db_all(`SELECT id, nome FROM regionais WHERE id = ?`, [regionalId]);
    
    if (!regional || regional.length === 0) {
      return res.status(404).json({ erro: 'Regional nÃ£o encontrada' });
    }

    // Busca regras dessa regional
    const regras = await db_all(`
      SELECT 
        id, 
        regionalId, 
        tipoMeta,
        periodo,
        meta1Volume, meta1Percent,
        meta2Volume, meta2Percent,
        meta3Volume, meta3Percent,
        meta1PercentIndividual,
        meta2PercentIndividual,
        meta3PercentIndividual,
        incrementoGlobal,
        pesoVendasChurn
      FROM regras_comissao
      WHERE regionalId = ?
      ORDER BY tipoMeta
    `, [regionalId]);

    // Busca colaboradores elegiveis (mesma base usada no resumo de comissionamento)
    // Nao restringimos por regional aqui para que o FTE considere alocacao cruzada
    // por movimento (vendedor pode ter vendas em mais de uma regional no periodo).
    const colaboradores = await db_all(`
      SELECT c.id, c.nome, c.regional_id, c.funcao_id, c.status, c.data_ativacao, c.data_inativacao
      FROM colaboradores c
      LEFT JOIN funcoes f ON f.id = c.funcao_id
      WHERE ${FILTRO_EXCLUIR_LIDERANCAS}
    `);
    const periodoReferencia = (regras[0] && regras[0].periodo) || 'Dez/25';
    const colaboradoresAtivosPeriodo = colaboradores.filter((c) => estaAtivoNoPeriodo(c, periodoReferencia));
    const totalVendedores = colaboradoresAtivosPeriodo.filter((c) => c.regional_id === regionalId).length;
    const baseCache = new Map();

    const metas = await Promise.all(regras.map(async (meta) => {
      const baseRegional = await obterBaseMetaRegionalPeriodo({
        regionalId,
        periodo: meta.periodo,
        colaboradoresElegiveis: colaboradores,
        cache: baseCache
      });
      const incremento = normalizarPercentual(meta.incrementoGlobal);
      const fatorIncremento = 1 + incremento;

      const metaIndividual1 = baseRegional.base > 0 
        ? (meta.meta1Volume / baseRegional.base) * fatorIncremento
        : 0;
      const metaIndividual2 = baseRegional.base > 0 
        ? (meta.meta2Volume / baseRegional.base) * fatorIncremento
        : 0;
      const metaIndividual3 = baseRegional.base > 0 
        ? (meta.meta3Volume / baseRegional.base) * fatorIncremento
        : 0;

      const percentual1 = normalizarPercentual(meta.meta1Percent);
      const percentual2 = normalizarPercentual(meta.meta2Percent);
      const percentual3 = normalizarPercentual(meta.meta3Percent);
      const percentualIndividual1 = normalizarPercentual(meta.meta1PercentIndividual);
      const percentualIndividual2 = normalizarPercentual(meta.meta2PercentIndividual);
      const percentualIndividual3 = normalizarPercentual(meta.meta3PercentIndividual);
      return {
        id: meta.id,
        tipoMeta: meta.tipoMeta,
        periodo: meta.periodo,
        baseMetaIndividual: {
          tipo: baseRegional.fte > 0 ? 'FTE' : 'HEADCOUNT',
          valor: Math.round(baseRegional.base * 100) / 100,
          headcount: baseRegional.headcount,
          fte: Math.round(baseRegional.fte * 100) / 100
        },
        
        metaRegional1: meta.meta1Volume,
        metaRegional2: meta.meta2Volume,
        metaRegional3: meta.meta3Volume,
        
        metaIndividual1: Math.round(metaIndividual1 * 100) / 100,
        metaIndividual2: Math.round(metaIndividual2 * 100) / 100,
        metaIndividual3: Math.round(metaIndividual3 * 100) / 100,
        
        percentual1: (percentual1 * 100).toFixed(2),
        percentual2: (percentual2 * 100).toFixed(2),
        percentual3: (percentual3 * 100).toFixed(2),
        percentualIndividual1: (percentualIndividual1 * 100).toFixed(2),
        percentualIndividual2: (percentualIndividual2 * 100).toFixed(2),
        percentualIndividual3: (percentualIndividual3 * 100).toFixed(2),
        
        incrementoGlobal: (incremento * 100).toFixed(2)
      };
    }));

    res.json({
      regional: regional[0].nome,
      totalVendedores: totalVendedores,
      colaboradores: colaboradoresAtivosPeriodo
        .filter((c) => c.regional_id === regionalId)
        .map(c => ({ id: c.id, nome: c.nome })),
      metas: metas
    });
  } catch (error) {
    console.error('Erro ao obter metas por regional:', error);
    res.status(500).json({ erro: 'Erro ao obter metas: ' + error.message });
  }
};

