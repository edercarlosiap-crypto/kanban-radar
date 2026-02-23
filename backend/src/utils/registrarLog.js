// ===================================================================
// UTILITARIO DE LOG DE AUDITORIA
// ===================================================================

const { db_run } = require('../config/database');

const registrarLog = async (usuario, acao, itemId) => {
  try {
    await db_run(
      'INSERT INTO logs (usuario, acao, item_id) VALUES (?, ?, ?)',
      [usuario || 'desconhecido', acao, itemId || null]
    );
  } catch (erro) {
    console.error('Erro ao registrar log:', erro);
  }
};

module.exports = registrarLog;
