const RegionalCidade = require('../models/RegionalCidade');

// GET /api/regional-cidades
exports.listar = async (req, res) => {
  try {
    const cidades = await RegionalCidade.listar();
    res.json({ cidades });
  } catch (erro) {
    console.error('Erro ao listar cidades por regional:', erro);
    res.status(500).json({ erro: 'Erro ao listar cidades por regional' });
  }
};

// POST /api/regional-cidades
exports.criar = async (req, res) => {
  try {
    const { cidade, regionalId, ativo } = req.body;
    if (!cidade || !String(cidade).trim()) {
      return res.status(400).json({ erro: 'Cidade obrigatoria' });
    }

    const existente = await RegionalCidade.buscarPorCidade(String(cidade).trim());
    if (existente) {
      return res.status(409).json({ erro: 'Cidade ja cadastrada no mapeamento' });
    }

    const id = await RegionalCidade.criar({
      cidade: String(cidade).trim(),
      regionalId: regionalId || null,
      ativo: ativo !== false
    });

    res.status(201).json({ mensagem: 'Cidade mapeada com sucesso', id });
  } catch (erro) {
    console.error('Erro ao criar cidade por regional:', erro);
    res.status(500).json({ erro: 'Erro ao criar cidade por regional' });
  }
};

// PUT /api/regional-cidades/:id
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { cidade, regionalId, ativo } = req.body;
    if (!cidade || !String(cidade).trim()) {
      return res.status(400).json({ erro: 'Cidade obrigatoria' });
    }

    const alteracoes = await RegionalCidade.atualizar(id, {
      cidade: String(cidade).trim(),
      regionalId: regionalId || null,
      ativo: ativo !== false
    });

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Cidade nao encontrada' });
    }

    res.json({ mensagem: 'Cidade atualizada com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar cidade por regional:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar cidade por regional' });
  }
};

// DELETE /api/regional-cidades/:id
exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const alteracoes = await RegionalCidade.deletar(id);

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Cidade nao encontrada' });
    }

    res.json({ mensagem: 'Cidade removida com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar cidade por regional:', erro);
    res.status(500).json({ erro: 'Erro ao deletar cidade por regional' });
  }
};

