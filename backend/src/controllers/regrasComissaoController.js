const RegrasComissao = require('../models/RegrasComissao');

// GET /api/regras-comissao
exports.listar = async (req, res) => {
  try {
    const regras = await RegrasComissao.listar();
    res.json({ regras });
  } catch (erro) {
    console.error('Erro ao listar regras:', erro);
    res.status(500).json({ erro: 'Erro ao listar regras' });
  }
};

// GET /api/regras-comissao/:id
exports.buscar = async (req, res) => {
  try {
    const { id } = req.params;
    const regra = await RegrasComissao.buscarPorId(id);

    if (!regra) {
      return res.status(404).json({ erro: 'Regra não encontrada' });
    }

    res.json(regra);
  } catch (erro) {
    console.error('Erro ao buscar regra:', erro);
    res.status(500).json({ erro: 'Erro ao buscar regra' });
  }
};

// GET /api/regras-comissao/regional/:regionalId
exports.porRegional = async (req, res) => {
  try {
    const { regionalId } = req.params;
    const regras = await RegrasComissao.buscarPorRegional(regionalId);

    res.json({ regras });
  } catch (erro) {
    console.error('Erro ao buscar regras por regional:', erro);
    res.status(500).json({ erro: 'Erro ao buscar regras' });
  }
};

// POST /api/regras-comissao
exports.criar = async (req, res) => {
  try {
    const dados = req.body;

    if (!dados.regionalId || !dados.tipoMeta) {
      return res.status(400).json({ erro: 'Campos obrigatórios não fornecidos' });
    }

    // Normalizar tipoMeta para lowercase
    dados.tipoMeta = dados.tipoMeta.toLowerCase().trim();

    const id = await RegrasComissao.criar(dados);

    res.status(201).json({
      mensagem: 'Regra de comissão criada com sucesso',
      id
    });
  } catch (erro) {
    console.error('Erro ao criar regra:', erro);
    res.status(500).json({ erro: 'Erro ao criar regra' });
  }
};

// PUT /api/regras-comissao/:id
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;

    // Normalizar tipoMeta para lowercase
    if (dados.tipoMeta) {
      dados.tipoMeta = dados.tipoMeta.toLowerCase().trim();
    }

    const alteracoes = await RegrasComissao.atualizar(id, dados);

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Regra não encontrada' });
    }

    res.json({ mensagem: 'Regra atualizada com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar regra:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar regra' });
  }
};

// DELETE /api/regras-comissao/:id
exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;

    const alteracoes = await RegrasComissao.deletar(id);

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Regra não encontrada' });
    }

    res.json({ mensagem: 'Regra deletada com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar regra:', erro);
    res.status(500).json({ erro: 'Erro ao deletar regra' });
  }
};
