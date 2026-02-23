const { v4: uuidv4 } = require('uuid');
const Colaborador = require('../models/Colaborador');

exports.criar = async (req, res) => {
  try {
    const { nome, regional_id, funcao_id } = req.body;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({ erro: 'Nome é obrigatório' });
    }

    if (!regional_id) {
      return res.status(400).json({ erro: 'Regional é obrigatória' });
    }

    if (!funcao_id) {
      return res.status(400).json({ erro: 'Função é obrigatória' });
    }

    const colaborador = {
      id: uuidv4(),
      nome: nome.trim(),
      regional_id,
      funcao_id
    };

    await Colaborador.criar(colaborador);

    res.status(201).json({
      mensagem: 'Colaborador criado com sucesso',
      colaborador: {
        id: colaborador.id,
        nome: colaborador.nome,
        regional_id: colaborador.regional_id,
        funcao_id: colaborador.funcao_id
      }
    });
  } catch (erro) {
    console.error('Erro ao criar colaborador:', erro);
    res.status(500).json({ erro: 'Erro ao criar colaborador: ' + erro.message });
  }
};

exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const colaborador = await Colaborador.buscarPorId(id);

    if (!colaborador) {
      return res.status(404).json({ erro: 'Colaborador não encontrado' });
    }

    res.json(colaborador);
  } catch (erro) {
    console.error('Erro ao buscar colaborador:', erro);
    res.status(500).json({ erro: 'Erro ao buscar colaborador: ' + erro.message });
  }
};

exports.listar = async (req, res) => {
  try {
    const colaboradores = await Colaborador.listar();
    res.json({
      total: colaboradores.length,
      colaboradores
    });
  } catch (erro) {
    console.error('Erro ao listar colaboradores:', erro);
    res.status(500).json({ erro: 'Erro ao listar colaboradores: ' + erro.message });
  }
};

exports.listarPorRegional = async (req, res) => {
  try {
    const { regional_id } = req.params;
    const colaboradores = await Colaborador.listarPorRegional(regional_id);

    res.json({
      total: colaboradores.length,
      colaboradores
    });
  } catch (erro) {
    console.error('Erro ao listar colaboradores por regional:', erro);
    res.status(500).json({ erro: 'Erro ao listar colaboradores: ' + erro.message });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, regional_id, funcao_id, status } = req.body;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({ erro: 'Nome é obrigatório' });
    }

    if (!regional_id) {
      return res.status(400).json({ erro: 'Regional é obrigatória' });
    }

    if (!funcao_id) {
      return res.status(400).json({ erro: 'Função é obrigatória' });
    }

    const colaborador = {
      nome: nome.trim(),
      regional_id,
      funcao_id,
      status
    };

    const resultado = await Colaborador.atualizar(id, colaborador);

    if (resultado.changes === 0) {
      return res.status(404).json({ erro: 'Colaborador não encontrado' });
    }

    res.json({ mensagem: 'Colaborador atualizado com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar colaborador:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar colaborador: ' + erro.message });
  }
};

exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await Colaborador.deletar(id);

    if (resultado.changes === 0) {
      return res.status(404).json({ erro: 'Colaborador não encontrado' });
    }

    res.json({ mensagem: 'Colaborador deletado com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar colaborador:', erro);
    res.status(500).json({ erro: 'Erro ao deletar colaborador: ' + erro.message });
  }
};
