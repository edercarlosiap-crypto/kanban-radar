const { v4: uuidv4 } = require('uuid');
const Colaborador = require('../models/Colaborador');

exports.criar = async (req, res) => {
  const { nome, regional_id, funcao_id, status, data_ativacao, data_inativacao } = req.body || {};
  try {

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
      funcao_id,
      status: status || 'ativo',
      data_ativacao: (status || 'ativo') === 'ativo'
        ? (data_ativacao || new Date().toISOString())
        : (data_ativacao || null),
      data_inativacao: status === 'inativo' ? (data_inativacao || new Date().toISOString()) : null
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
    const mensagemErro = String(erro?.message || '');
    const duplicadoNomeRegional = /UNIQUE constraint failed/i.test(mensagemErro)
      && (
        mensagemErro.includes('uq_colaboradores_nome_regional_ci')
        || mensagemErro.includes('colaboradores.regional_id')
      );
    if (duplicadoNomeRegional) {
      const existente = await Colaborador.buscarPorNomeRegional(nome.trim(), regional_id);
      if (existente?.id) {
        return res.status(200).json({
          mensagem: 'Colaborador ja existente na regional. Registro reaproveitado.',
          colaborador: {
            id: existente.id,
            nome: existente.nome,
            regional_id: existente.regional_id,
            funcao_id: existente.funcao_id
          }
        });
      }
    }
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
    const { nome, regional_id, funcao_id, status, data_ativacao, data_inativacao } = req.body;

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
      status,
      data_ativacao: status === 'ativo'
        ? (data_ativacao || new Date().toISOString())
        : (data_ativacao || null),
      data_inativacao: status === 'inativo'
        ? (data_inativacao || new Date().toISOString())
        : null
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

exports.inativar = async (req, res) => {
  try {
    const { id } = req.params;
    const dataInativacao = req.body?.data_inativacao || new Date().toISOString();
    const colaborador = await Colaborador.buscarPorId(id);
    const dataAtivacaoAtual = colaborador?.data_ativacao || null;
    const resultado = await Colaborador.atualizarStatus(id, 'inativo', dataInativacao, dataAtivacaoAtual);
    if (resultado.changes === 0) {
      return res.status(404).json({ erro: 'Colaborador não encontrado' });
    }
    res.json({ mensagem: 'Colaborador inativado com sucesso', data_inativacao: dataInativacao });
  } catch (erro) {
    console.error('Erro ao inativar colaborador:', erro);
    res.status(500).json({ erro: 'Erro ao inativar colaborador: ' + erro.message });
  }
};

exports.reativar = async (req, res) => {
  try {
    const { id } = req.params;
    const dataAtivacao = req.body?.data_ativacao || new Date().toISOString();
    const resultado = await Colaborador.atualizarStatus(id, 'ativo', null, dataAtivacao);
    if (resultado.changes === 0) {
      return res.status(404).json({ erro: 'Colaborador não encontrado' });
    }
    res.json({ mensagem: 'Colaborador reativado com sucesso', data_ativacao: dataAtivacao });
  } catch (erro) {
    console.error('Erro ao reativar colaborador:', erro);
    res.status(500).json({ erro: 'Erro ao reativar colaborador: ' + erro.message });
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
