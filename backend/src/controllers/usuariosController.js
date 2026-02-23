const Usuario = require('../models/Usuario');

// GET /api/usuarios
exports.listar = async (req, res) => {
  try {
    const usuarios = await Usuario.listar();
    res.json({ usuarios });
  } catch (erro) {
    console.error('Erro ao listar usuários:', erro);
    res.status(500).json({ erro: 'Erro ao listar usuários' });
  }
};

// GET /api/usuarios/:id
exports.buscar = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.buscarPorId(id);

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    res.json(usuario);
  } catch (erro) {
    console.error('Erro ao buscar usuário:', erro);
    res.status(500).json({ erro: 'Erro ao buscar usuário' });
  }
};

// PUT /api/usuarios/:id
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;

    const alteracoes = await Usuario.atualizar(id, dados);

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    res.json({ mensagem: 'Usuário atualizado com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar usuário:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar usuário' });
  }
};

// DELETE /api/usuarios/:id
exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;

    const alteracoes = await Usuario.deletar(id);

    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    res.json({ mensagem: 'Usuário deletado com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar usuário:', erro);
    res.status(500).json({ erro: 'Erro ao deletar usuário' });
  }
};
