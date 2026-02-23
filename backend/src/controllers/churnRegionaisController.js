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
    const { periodo, regionalId, churn } = req.body;

    if (!periodo || !regionalId) {
      return res.status(400).json({ erro: 'Periodo e regionalId são obrigatórios' });
    }

    const churnNormalizado = normalizarNumero(churn);
    const existente = await ChurnRegional.buscarPorRegionalPeriodo(regionalId, periodo);

    if (existente) {
      await ChurnRegional.atualizar(existente.id, { periodo, regionalId, churn: churnNormalizado });
      return res.json({ mensagem: 'Churn regional atualizado com sucesso', id: existente.id });
    }

    const id = await ChurnRegional.criar({ periodo, regionalId, churn: churnNormalizado });
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
    const { periodo, regionalId, churn } = req.body;

    if (!periodo || !regionalId) {
      return res.status(400).json({ erro: 'Periodo e regionalId são obrigatórios' });
    }

    const churnNormalizado = normalizarNumero(churn);
    const alteracoes = await ChurnRegional.atualizar(id, { periodo, regionalId, churn: churnNormalizado });

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
