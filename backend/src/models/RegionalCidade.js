const { db_run, db_get, db_all } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class RegionalCidade {
  static async listar() {
    return db_all(
      `SELECT rc.*, r.nome AS regional_nome
       FROM regional_cidades rc
       LEFT JOIN regionais r ON r.id = rc.regional_id
       ORDER BY rc.cidade ASC`
    );
  }

  static async buscarPorId(id) {
    return db_get('SELECT * FROM regional_cidades WHERE id = ?', [id]);
  }

  static async buscarPorCidade(cidade) {
    return db_get(
      'SELECT * FROM regional_cidades WHERE LOWER(cidade) = LOWER(?)',
      [cidade]
    );
  }

  static async criar({ cidade, regionalId, ativo = 1 }) {
    const id = uuidv4();
    await db_run(
      `INSERT INTO regional_cidades (id, cidade, regional_id, ativo)
       VALUES (?, ?, ?, ?)`,
      [id, cidade, regionalId || null, ativo ? 1 : 0]
    );
    return id;
  }

  static async atualizar(id, { cidade, regionalId, ativo = 1 }) {
    const result = await db_run(
      `UPDATE regional_cidades
       SET cidade = ?, regional_id = ?, ativo = ?
       WHERE id = ?`,
      [cidade, regionalId || null, ativo ? 1 : 0, id]
    );
    return result.changes;
  }

  static async deletar(id) {
    const result = await db_run('DELETE FROM regional_cidades WHERE id = ?', [id]);
    return result.changes;
  }
}

module.exports = RegionalCidade;

