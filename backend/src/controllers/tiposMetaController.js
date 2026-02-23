const { db_all, db_get, db_run } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Listar todos os tipos de meta
exports.listar = async (req, res) => {
  try {
    const rows = await db_all('SELECT * FROM tipos_meta ORDER BY nome ASC');
    res.json({ tiposMeta: rows });
  } catch (err) {
    res.status(500).json({
      erro: 'Erro ao listar tipos de meta',
      detalhes: err.message
    });
  }
};

// Obter um tipo de meta específico
exports.obter = async (req, res) => {
  const { id } = req.params;

  try {
    const row = await db_get('SELECT * FROM tipos_meta WHERE id = ?', [id]);
    if (!row) {
      return res.status(404).json({ erro: 'Tipo de meta não encontrado' });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({
      erro: 'Erro ao obter tipo de meta',
      detalhes: err.message
    });
  }
};

// Criar novo tipo de meta
exports.criar = async (req, res) => {
  const {
    nome,
    descricao,
    meta1Volume,
    meta1Percent,
    meta1PercentIndividual,
    meta2Volume,
    meta2Percent,
    meta2PercentIndividual,
    meta3Volume,
    meta3Percent,
    meta3PercentIndividual,
    incrementoGlobal,
    pesoVendasChurn
  } = req.body;

  // Validar campos obrigatórios
  if (!nome) {
    return res.status(400).json({ erro: 'Nome do tipo de meta é obrigatório' });
  }

  const id = uuidv4();
  const agora = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    await db_run(
      `INSERT INTO tipos_meta 
       (id, nome, descricao, meta1Volume, meta1Percent, meta1PercentIndividual,
        meta2Volume, meta2Percent, meta2PercentIndividual,
        meta3Volume, meta3Percent, meta3PercentIndividual,
        incrementoGlobal, pesoVendasChurn, dataCriacao, dataAtualizacao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, nome, descricao,
        meta1Volume || null, meta1Percent || null, meta1PercentIndividual || null,
        meta2Volume || null, meta2Percent || null, meta2PercentIndividual || null,
        meta3Volume || null, meta3Percent || null, meta3PercentIndividual || null,
        incrementoGlobal || null, pesoVendasChurn || null,
        agora, agora
      ]
    );

    res.status(201).json({
      mensagem: 'Tipo de meta criado com sucesso',
      id
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ erro: 'Já existe um tipo de meta com este nome' });
    }
    res.status(500).json({
      erro: 'Erro ao criar tipo de meta',
      detalhes: err.message
    });
  }
};

// Atualizar tipo de meta
exports.atualizar = async (req, res) => {
  const { id } = req.params;
  const {
    nome,
    descricao,
    meta1Volume,
    meta1Percent,
    meta1PercentIndividual,
    meta2Volume,
    meta2Percent,
    meta2PercentIndividual,
    meta3Volume,
    meta3Percent,
    meta3PercentIndividual,
    incrementoGlobal,
    pesoVendasChurn
  } = req.body;

  const agora = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const result = await db_run(
      `UPDATE tipos_meta 
       SET nome = ?, descricao = ?,
           meta1Volume = ?, meta1Percent = ?, meta1PercentIndividual = ?,
           meta2Volume = ?, meta2Percent = ?, meta2PercentIndividual = ?,
           meta3Volume = ?, meta3Percent = ?, meta3PercentIndividual = ?,
           incrementoGlobal = ?, pesoVendasChurn = ?,
           dataAtualizacao = ?
       WHERE id = ?`,
      [
        nome, descricao,
        meta1Volume || null, meta1Percent || null, meta1PercentIndividual || null,
        meta2Volume || null, meta2Percent || null, meta2PercentIndividual || null,
        meta3Volume || null, meta3Percent || null, meta3PercentIndividual || null,
        incrementoGlobal || null, pesoVendasChurn || null,
        agora, id
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ erro: 'Tipo de meta não encontrado' });
    }

    res.json({ mensagem: 'Tipo de meta atualizado com sucesso' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ erro: 'Já existe um tipo de meta com este nome' });
    }
    res.status(500).json({
      erro: 'Erro ao atualizar tipo de meta',
      detalhes: err.message
    });
  }
};

// Deletar tipo de meta
exports.deletar = async (req, res) => {
  const { id } = req.params;

  // Verificar se o tipo de meta está sendo usado em regras
  try {
    const row = await db_get(
      `SELECT COUNT(*) as total FROM regras_comissao WHERE tipoMeta = 
       (SELECT nome FROM tipos_meta WHERE id = ?)`,
      [id]
    );

    if (row.total > 0) {
      return res.status(400).json({
        erro: 'Não é possível deletar este tipo de meta pois está sendo usado em regras de comissão'
      });
    }

    const result = await db_run('DELETE FROM tipos_meta WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ erro: 'Tipo de meta não encontrado' });
    }
    res.json({ mensagem: 'Tipo de meta deletado com sucesso' });
  } catch (err) {
    res.status(500).json({
      erro: 'Erro ao deletar tipo de meta',
      detalhes: err.message
    });
  }
};
