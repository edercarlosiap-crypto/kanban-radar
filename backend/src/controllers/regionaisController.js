const Regional = require('../models/Regional');

// GET /api/regionais
exports.listar = async (req, res) => {
  try {
    const regionais = await Regional.listar();
    res.json({ regionais });
  } catch (erro) {
    console.error('Erro ao listar regionais:', erro);
    res.status(500).json({ erro: 'Erro ao listar regionais' });
  }
};

// GET /api/regionais/:id
exports.buscar = async (req, res) => {
  try {
    const { id } = req.params;
    const regional = await Regional.buscarPorId(id);

    if (!regional) {
      return res.status(404).json({ erro: 'Regional não encontrada' });
    }

    res.json(regional);
  } catch (erro) {
    console.error('Erro ao buscar regional:', erro);
    res.status(500).json({ erro: 'Erro ao buscar regional' });
  }
};

// POST /api/regionais
exports.criar = async (req, res) => {
  try {
    const dados = req.body;

    if (!dados.nome) {
      return res.status(400).json({ erro: 'Nome obrigatório' });
    }

    const id = await Regional.criar(dados);

    res.status(201).json({
      mensagem: 'Regional criada com sucesso',
      id
    });
  } catch (erro) {
    console.error('Erro ao criar regional:', erro);
    res.status(500).json({ erro: 'Erro ao criar regional' });
  }
};

// PUT /api/regionais/:id
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;

    const alteracoes = await Regional.atualizar(id, dados);

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Regional não encontrada' });
    }

    res.json({ mensagem: 'Regional atualizada com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar regional:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar regional' });
  }
};

// DELETE /api/regionais/:id
exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;

    const alteracoes = await Regional.deletar(id);

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Regional não encontrada' });
    }

    res.json({ mensagem: 'Regional deletada com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar regional:', erro);
    res.status(500).json({ erro: 'Erro ao deletar regional' });
  }
};
