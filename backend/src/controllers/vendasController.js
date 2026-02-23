const SalesRecord = require('../models/SalesRecord');

// GET /api/vendas
exports.listar = async (req, res) => {
  try {
    const vendas = await SalesRecord.listar();
    res.json({ vendas });
  } catch (erro) {
    console.error('Erro ao listar vendas:', erro);
    res.status(500).json({ erro: 'Erro ao listar vendas' });
  }
};

// GET /api/vendas/:id
exports.buscar = async (req, res) => {
  try {
    const { id } = req.params;
    const venda = await SalesRecord.buscarPorId(id);

    if (!venda) {
      return res.status(404).json({ erro: 'Venda não encontrada' });
    }

    res.json(venda);
  } catch (erro) {
    console.error('Erro ao buscar venda:', erro);
    res.status(500).json({ erro: 'Erro ao buscar venda' });
  }
};

// GET /api/vendas/usuario/:usuarioId
exports.porUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const vendas = await SalesRecord.listarPorUsuario(usuarioId);

    res.json({ vendas });
  } catch (erro) {
    console.error('Erro ao buscar vendas por usuário:', erro);
    res.status(500).json({ erro: 'Erro ao buscar vendas' });
  }
};

// GET /api/vendas/regional/:regionalId
exports.porRegional = async (req, res) => {
  try {
    const { regionalId } = req.params;
    const vendas = await SalesRecord.listarPorRegional(regionalId);

    res.json({ vendas });
  } catch (erro) {
    console.error('Erro ao buscar vendas por regional:', erro);
    res.status(500).json({ erro: 'Erro ao buscar vendas' });
  }
};

// POST /api/vendas
exports.criar = async (req, res) => {
  try {
    const dados = req.body;

    if (!dados.usuarioId || !dados.regionalId || !dados.valor || !dados.tipo) {
      return res.status(400).json({ erro: 'Campos obrigatórios não fornecidos' });
    }

    const id = await SalesRecord.criar(dados);

    res.status(201).json({
      mensagem: 'Venda registrada com sucesso',
      id
    });
  } catch (erro) {
    console.error('Erro ao criar venda:', erro);
    res.status(500).json({ erro: 'Erro ao registrar venda' });
  }
};

// PUT /api/vendas/:id
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;

    const alteracoes = await SalesRecord.atualizar(id, dados);

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Venda não encontrada' });
    }

    res.json({ mensagem: 'Venda atualizada com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar venda:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar venda' });
  }
};

// DELETE /api/vendas/:id
exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;

    const alteracoes = await SalesRecord.deletar(id);

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Venda não encontrada' });
    }

    res.json({ mensagem: 'Venda deletada com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar venda:', erro);
    res.status(500).json({ erro: 'Erro ao deletar venda' });
  }
};
