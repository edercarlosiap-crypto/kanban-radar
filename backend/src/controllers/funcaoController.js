const { v4: uuidv4 } = require('uuid');
const Funcao = require('../models/Funcao');

exports.criar = async (req, res) => {
  try {
    const { nome, eligivel_comissionamento } = req.body;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({ erro: 'Nome é obrigatório' });
    }

    const funcao = {
      id: uuidv4(),
      nome: nome.trim(),
      eligivel_comissionamento: eligivel_comissionamento === true || eligivel_comissionamento === '1' || eligivel_comissionamento === 1
    };

    await Funcao.criar(funcao);

    res.status(201).json({
      mensagem: 'Função criada com sucesso',
      funcao: {
        id: funcao.id,
        nome: funcao.nome,
        eligivel_comissionamento: funcao.eligivel_comissionamento
      }
    });
  } catch (erro) {
    console.error('Erro ao criar função:', erro);
    res.status(500).json({ erro: 'Erro ao criar função: ' + erro.message });
  }
};

exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const funcao = await Funcao.buscarPorId(id);

    if (!funcao) {
      return res.status(404).json({ erro: 'Função não encontrada' });
    }

    res.json(funcao);
  } catch (erro) {
    console.error('Erro ao buscar função:', erro);
    res.status(500).json({ erro: 'Erro ao buscar função: ' + erro.message });
  }
};

exports.listar = async (req, res) => {
  try {
    const funcoes = await Funcao.listar();
    res.json({
      total: funcoes.length,
      funcoes
    });
  } catch (erro) {
    console.error('Erro ao listar funções:', erro);
    res.status(500).json({ erro: 'Erro ao listar funções: ' + erro.message });
  }
};

exports.listarElegíveis = async (req, res) => {
  try {
    const funcoes = await Funcao.listarElegíveis();
    res.json({
      total: funcoes.length,
      funcoes
    });
  } catch (erro) {
    console.error('Erro ao listar funções elegíveis:', erro);
    res.status(500).json({ erro: 'Erro ao listar funções elegíveis: ' + erro.message });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, eligivel_comissionamento, status } = req.body;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({ erro: 'Nome é obrigatório' });
    }

    const funcao = {
      nome: nome.trim(),
      eligivel_comissionamento: eligivel_comissionamento === true || eligivel_comissionamento === '1' || eligivel_comissionamento === 1,
      status
    };

    const resultado = await Funcao.atualizar(id, funcao);

    if (resultado.changes === 0) {
      return res.status(404).json({ erro: 'Função não encontrada' });
    }

    res.json({ mensagem: 'Função atualizada com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar função:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar função: ' + erro.message });
  }
};

exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await Funcao.deletar(id);

    if (resultado.changes === 0) {
      return res.status(404).json({ erro: 'Função não encontrada' });
    }

    res.json({ mensagem: 'Função deletada com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar função:', erro);
    res.status(500).json({ erro: 'Erro ao deletar função: ' + erro.message });
  }
};
