const { db_all } = require('../config/database');

const normalizarPercentual = (valor) => {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return 0;
  return numero > 1 ? numero / 100 : numero;
};

exports.obterMetasIndividualizadas = async (req, res) => {
  try {
    // Busca todas as regionais
    const regionais = await db_all(`SELECT id, nome FROM regionais ORDER BY nome`);

    // Busca todas as regras de comissão
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

    // Busca todos os colaboradores
    const colaboradores = await db_all(`SELECT id, nome, regional_id FROM colaboradores`);

    // Conta colaboradores por regional
    const colaboradoresPorRegional = {};
    colaboradores.forEach(colab => {
      if (!colaboradoresPorRegional[colab.regional_id]) {
        colaboradoresPorRegional[colab.regional_id] = 0;
      }
      colaboradoresPorRegional[colab.regional_id]++;
    });

    // Agrupa regras por regional
    const ragrasPorRegional = {};
    regras.forEach(regra => {
      if (!ragrasPorRegional[regra.regionalId]) {
        ragrasPorRegional[regra.regionalId] = [];
      }
      ragrasPorRegional[regra.regionalId].push(regra);
    });

    // Monta o relatório
    const relatorio = regionais.map(regional => {
      const totalVendedores = colaboradoresPorRegional[regional.id] || 0;
      const metasRegionais = ragrasPorRegional[regional.id] || [];

      return {
        id: regional.id,
        nome: regional.nome,
        totalVendedores: totalVendedores,
        metas: metasRegionais.map(meta => {
          // Calcula a meta individual: (meta_regional / total_vendedores) * (1 + incremento)
          const metaIndividual1 = totalVendedores > 0 
            ? (meta.meta1Volume / totalVendedores) * (1 + meta.incrementoGlobal)
            : 0;
          const metaIndividual2 = totalVendedores > 0 
            ? (meta.meta2Volume / totalVendedores) * (1 + meta.incrementoGlobal)
            : 0;
          const metaIndividual3 = totalVendedores > 0 
            ? (meta.meta3Volume / totalVendedores) * (1 + meta.incrementoGlobal)
            : 0;

          const percentual1 = normalizarPercentual(meta.meta1Percent);
          const percentual2 = normalizarPercentual(meta.meta2Percent);
          const percentual3 = normalizarPercentual(meta.meta3Percent);
          const percentualIndividual1 = normalizarPercentual(meta.meta1PercentIndividual);
          const percentualIndividual2 = normalizarPercentual(meta.meta2PercentIndividual);
          const percentualIndividual3 = normalizarPercentual(meta.meta3PercentIndividual);
          const incremento = normalizarPercentual(meta.incrementoGlobal);

          return {
            id: meta.id,
            tipoMeta: meta.tipoMeta,
            periodo: meta.periodo,
            
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

    res.json(relatorio);
  } catch (error) {
    console.error('Erro ao obter metas individualizadas:', error);
    res.status(500).json({ erro: 'Erro ao obter metas: ' + error.message });
  }
};

exports.obterMetasIndividualizadasPorRegional = async (req, res) => {
  try {
    const { regionalId } = req.params;

    // Busca a regional específica
    const regional = await db_all(`SELECT id, nome FROM regionais WHERE id = ?`, [regionalId]);
    
    if (!regional || regional.length === 0) {
      return res.status(404).json({ erro: 'Regional não encontrada' });
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

    // Busca colaboradores dessa regional
    const colaboradores = await db_all(`SELECT id, nome, funcao_id FROM colaboradores WHERE regional_id = ?`, [regionalId]);

    const totalVendedores = colaboradores.length;

    const metas = regras.map(meta => {
      const metaIndividual1 = totalVendedores > 0 
        ? (meta.meta1Volume / totalVendedores) * (1 + meta.incrementoGlobal)
        : 0;
      const metaIndividual2 = totalVendedores > 0 
        ? (meta.meta2Volume / totalVendedores) * (1 + meta.incrementoGlobal)
        : 0;
      const metaIndividual3 = totalVendedores > 0 
        ? (meta.meta3Volume / totalVendedores) * (1 + meta.incrementoGlobal)
        : 0;

      const percentual1 = normalizarPercentual(meta.meta1Percent);
      const percentual2 = normalizarPercentual(meta.meta2Percent);
      const percentual3 = normalizarPercentual(meta.meta3Percent);
      const percentualIndividual1 = normalizarPercentual(meta.meta1PercentIndividual);
      const percentualIndividual2 = normalizarPercentual(meta.meta2PercentIndividual);
      const percentualIndividual3 = normalizarPercentual(meta.meta3PercentIndividual);
      const incremento = normalizarPercentual(meta.incrementoGlobal);

      return {
        id: meta.id,
        tipoMeta: meta.tipoMeta,
        periodo: meta.periodo,
        
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
    });

    res.json({
      regional: regional[0].nome,
      totalVendedores: totalVendedores,
      colaboradores: colaboradores.map(c => ({ id: c.id, nome: c.nome })),
      metas: metas
    });
  } catch (error) {
    console.error('Erro ao obter metas por regional:', error);
    res.status(500).json({ erro: 'Erro ao obter metas: ' + error.message });
  }
};
