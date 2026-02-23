const RegrasComissao = require('../models/RegrasComissao');

// GET /api/regras-comissao - Listar todas as regras de comissão
exports.listar = async (req, res) => {
  try {
    const regras = await RegrasComissao.listar();
    res.status(200).json(regras || []);
  } catch (erro) {
    console.error('Erro ao listar regras de comissão:', erro);
    res.status(500).json({ erro: 'Erro ao listar regras de comissão' });
  }
};

// GET /api/regras-comissao/:id - Obter uma regra específica
exports.obter = async (req, res) => {
  try {
    const { id } = req.params;
    const regra = await RegrasComissao.buscarPorId(id);
    
    if (!regra) {
      return res.status(404).json({ erro: 'Regra de comissão não encontrada' });
    }
    
    res.status(200).json(regra);
  } catch (erro) {
    console.error('Erro ao obter regra de comissão:', erro);
    res.status(500).json({ erro: 'Erro ao obter regra de comissão' });
  }
};

// POST /api/regras-comissao - Criar nova regra
exports.criar = async (req, res) => {
  try {
    const { regionalId, tipoMeta, periodo, meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, incrementoGlobal, pesoVendasChurn, meta1PercentIndividual, meta2PercentIndividual, meta3PercentIndividual } = req.body;

    if (!regionalId || !tipoMeta || meta1Volume === undefined || meta1Percent === undefined || meta2Volume === undefined || meta2Percent === undefined || meta3Volume === undefined || meta3Percent === undefined) {
      return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
    }

    const id = await RegrasComissao.criar({
      regionalId,
      tipoMeta,
      periodo,
      meta1Volume,
      meta1Percent,
      meta2Volume,
      meta2Percent,
      meta3Volume,
      meta3Percent,
      incrementoGlobal,
      pesoVendasChurn,
      meta1PercentIndividual,
      meta2PercentIndividual,
      meta3PercentIndividual
    });

    res.status(201).json({
      mensagem: 'Regra de comissão criada com sucesso',
      id
    });
  } catch (erro) {
    console.error('Erro ao criar regra de comissão:', erro);
    res.status(500).json({ erro: 'Erro ao criar regra de comissão' });
  }
};

// PUT /api/regras-comissao/:id - Atualizar regra
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { regionalId, tipoMeta, periodo, meta1Volume, meta1Percent, meta2Volume, meta2Percent, meta3Volume, meta3Percent, incrementoGlobal, pesoVendasChurn, meta1PercentIndividual, meta2PercentIndividual, meta3PercentIndividual } = req.body;

    if (!tipoMeta || meta1Volume === undefined || meta1Percent === undefined || meta2Volume === undefined || meta2Percent === undefined || meta3Volume === undefined || meta3Percent === undefined) {
      return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
    }

    const changes = await RegrasComissao.atualizar(id, {
      tipoMeta,
      periodo,
      meta1Volume,
      meta1Percent,
      meta2Volume,
      meta2Percent,
      meta3Volume,
      meta3Percent,
      incrementoGlobal,
      pesoVendasChurn,
      meta1PercentIndividual,
      meta2PercentIndividual,
      meta3PercentIndividual
    });

    if (changes === 0) {
      return res.status(404).json({ erro: 'Regra de comissão não encontrada' });
    }

    res.status(200).json({ mensagem: 'Regra de comissão atualizada com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar regra de comissão:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar regra de comissão' });
  }
};

// DELETE /api/regras-comissao/:id - Deletar regra
exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;

    const changes = await RegrasComissao.deletar(id);

    if (changes === 0) {
      return res.status(404).json({ erro: 'Regra de comissão não encontrada' });
    }

    res.status(200).json({ mensagem: 'Regra de comissão deletada com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar regra de comissão:', erro);
    res.status(500).json({ erro: 'Erro ao deletar regra de comissão' });
  }
};
