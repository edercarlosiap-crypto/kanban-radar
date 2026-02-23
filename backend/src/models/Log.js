// ===================================================================
// MODELO DE LOGS DE AUDITORIA
// ===================================================================

const { db_all } = require('../config/database');

class Log {
  static async listarTodos() {
    try {
      return await db_all(
        'SELECT id, usuario, acao, item_id, data FROM logs ORDER BY data DESC'
      );
    } catch (erro) {
      throw erro;
    }
  }
}

module.exports = Log;
