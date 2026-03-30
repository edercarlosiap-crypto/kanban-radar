const ChurnRegional = require('../models/ChurnRegional');

const normalizarNumero = (valor) => {
  if (valor === null || valor === undefined || valor === '') {
    return 0;
  }

  const numero = Number(valor);
  return Number.isNaN(numero) ? 0 : numero;
};

// GET /api/churn-regionais
exports.listar = async (req, res) => {
  try {
    const { periodo, regionalId } = req.query;

    if (periodo && regionalId) {
      const registro = await ChurnRegional.buscarPorRegionalPeriodo(regionalId, periodo);
      return res.json({ registro });
    }

    if (periodo) {
      const registros = await ChurnRegional.listarPorPeriodo(periodo);
      return res.json({ registros });
    }

    if (regionalId) {
      const registros = await ChurnRegional.listarPorRegional(regionalId);
      return res.json({ registros });
    }

    const registros = await ChurnRegional.listar();
    res.json({ registros });
  } catch (erro) {
    console.error('Erro ao listar churn regional:', erro);
    res.status(500).json({ erro: 'Erro ao listar churn regional' });
  }
};

// GET /api/churn-regionais/:id
exports.buscar = async (req, res) => {
  try {
    const { id } = req.params;
    const registro = await ChurnRegional.buscarPorId(id);

    if (!registro) {
      return res.status(404).json({ erro: 'Registro de churn não encontrado' });
    }

    res.json(registro);
  } catch (erro) {
    console.error('Erro ao buscar churn regional:', erro);
    res.status(500).json({ erro: 'Erro ao buscar churn regional' });
  }
};

// POST /api/churn-regionais
exports.criarOuAtualizar = async (req, res) => {
  try {
    const { periodo, regionalId, churn, baseRef, canceladosChurn } = req.body;

    if (!periodo || !regionalId) {
      return res.status(400).json({ erro: 'Periodo e regionalId são obrigatórios' });
    }

    const canceladosChurnNormalizado = normalizarNumero(canceladosChurn);
    const churnNormalizado = normalizarNumero(churn ?? canceladosChurnNormalizado);
    const baseRefNormalizado = normalizarNumero(baseRef);
    const existente = await ChurnRegional.buscarPorRegionalPeriodo(regionalId, periodo);

    if (existente) {
      await ChurnRegional.atualizar(existente.id, {
        periodo,
        regionalId,
        churn: churnNormalizado,
        baseRef: baseRefNormalizado,
        canceladosChurn: canceladosChurnNormalizado
      });
      return res.json({ mensagem: 'Churn regional atualizado com sucesso', id: existente.id });
    }

    const id = await ChurnRegional.criar({
      periodo,
      regionalId,
      churn: churnNormalizado,
      baseRef: baseRefNormalizado,
      canceladosChurn: canceladosChurnNormalizado
    });
    res.status(201).json({ mensagem: 'Churn regional registrado com sucesso', id });
  } catch (erro) {
    console.error('Erro ao registrar churn regional:', erro);
    res.status(500).json({ erro: 'Erro ao registrar churn regional' });
  }
};

// PUT /api/churn-regionais/:id
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { periodo, regionalId, churn, baseRef, canceladosChurn } = req.body;

    if (!periodo || !regionalId) {
      return res.status(400).json({ erro: 'Periodo e regionalId são obrigatórios' });
    }

    const canceladosChurnNormalizado = normalizarNumero(canceladosChurn);
    const churnNormalizado = normalizarNumero(churn ?? canceladosChurnNormalizado);
    const baseRefNormalizado = normalizarNumero(baseRef);
    const alteracoes = await ChurnRegional.atualizar(id, {
      periodo,
      regionalId,
      churn: churnNormalizado,
      baseRef: baseRefNormalizado,
      canceladosChurn: canceladosChurnNormalizado
    });

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Registro de churn não encontrado' });
    }

    res.json({ mensagem: 'Churn regional atualizado com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar churn regional:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar churn regional' });
  }
};

// DELETE /api/churn-regionais/:id
exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const alteracoes = await ChurnRegional.deletar(id);

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Registro de churn não encontrado' });
    }

    res.json({ mensagem: 'Churn regional deletado com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar churn regional:', erro);
    res.status(500).json({ erro: 'Erro ao deletar churn regional' });
  }
};

// POST /api/churn-regionais/lote
exports.importarLote = async (req, res) => {
  try {
    const registros = Array.isArray(req.body?.registros) ? req.body.registros : [];

    if (!registros.length) {
      return res.status(400).json({ erro: 'Nenhum registro informado para importacao em lote' });
    }

    let sucesso = 0;
    let atualizados = 0;
    let falhas = 0;
    const erros = [];

    for (let i = 0; i < registros.length; i += 1) {
      const linha = i + 1;
      const row = registros[i] || {};
      try {
        const periodo = String(row.periodo || '').trim();
        const regionalId = String(row.regionalId || '').trim();

        if (!periodo || !regionalId) {
          falhas += 1;
          erros.push(`Linha ${linha}: periodo e regionalId sao obrigatorios`);
          continue;
        }

        const canceladosChurnNormalizado = normalizarNumero(row.canceladosChurn);
        const churnNormalizado = normalizarNumero(row.churn ?? canceladosChurnNormalizado);
        const baseRefNormalizado = normalizarNumero(row.baseRef);

        const existente = await ChurnRegional.buscarPorRegionalPeriodo(regionalId, periodo);
        if (existente?.id) {
          await ChurnRegional.atualizar(existente.id, {
            periodo,
            regionalId,
            churn: churnNormalizado,
            baseRef: baseRefNormalizado,
            canceladosChurn: canceladosChurnNormalizado
          });
          atualizados += 1;
        } else {
          await ChurnRegional.criar({
            periodo,
            regionalId,
            churn: churnNormalizado,
            baseRef: baseRefNormalizado,
            canceladosChurn: canceladosChurnNormalizado
          });
        }

        sucesso += 1;
      } catch (error) {
        falhas += 1;
        erros.push(`Linha ${linha}: ${error.message}`);
      }
    }

    return res.json({
      mensagem: `Importacao concluida: ${sucesso} registro(s) processado(s), ${atualizados} atualizado(s), ${falhas} falha(s).`,
      sucesso,
      atualizados,
      falhas,
      erros: erros.slice(0, 100)
    });
  } catch (erro) {
    console.error('Erro ao importar churn regional em lote:', erro);
    return res.status(500).json({ erro: 'Erro ao importar churn regional em lote' });
  }
};
