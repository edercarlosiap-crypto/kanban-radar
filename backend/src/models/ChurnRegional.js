const { db_run, db_get, db_all } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ChurnRegional {
  static async listar() {
    return db_all('SELECT * FROM churn_regionais ORDER BY periodo DESC, dataCriacao DESC');
  }

  static async buscarPorId(id) {
    return db_get('SELECT * FROM churn_regionais WHERE id = ?', [id]);
  }

  static async buscarPorRegionalPeriodo(regionalId, periodo) {
    return db_get(
      'SELECT * FROM churn_regionais WHERE regional_id = ? AND periodo = ?',
      [regionalId, periodo]
    );
  }

  static async listarPorPeriodo(periodo) {
    return db_all(
      'SELECT * FROM churn_regionais WHERE periodo = ? ORDER BY dataCriacao DESC',
      [periodo]
    );
  }

  static async listarPorRegional(regionalId) {
    return db_all(
      'SELECT * FROM churn_regionais WHERE regional_id = ? ORDER BY periodo DESC',
      [regionalId]
    );
  }

  static async criar(dados) {
    const id = uuidv4();

    await db_run(
      `INSERT INTO churn_regionais (id, periodo, regional_id, churn, base_ref, cancelados_churn, dataAtualizacao)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, dados.periodo, dados.regionalId, dados.churn, dados.baseRef || 0, dados.canceladosChurn || 0]
    );

    return id;
  }

  static async atualizar(id, dados) {
    const result = await db_run(
      `UPDATE churn_regionais SET
        periodo = ?,
        regional_id = ?,
        churn = ?,
        base_ref = ?,
        cancelados_churn = ?,
        dataAtualizacao = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [dados.periodo, dados.regionalId, dados.churn, dados.baseRef || 0, dados.canceladosChurn || 0, id]
    );

    return result.changes;
  }

  static async deletar(id) {
    const result = await db_run('DELETE FROM churn_regionais WHERE id = ?', [id]);
    return result.changes;
  }
}

module.exports = ChurnRegional;
