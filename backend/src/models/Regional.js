const { db_run, db_get, db_all } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Regional {
  static async criar(dados) {
    try {
      const id = uuidv4();

      await db_run(
        `INSERT INTO regionais (id, nome, ativo)
         VALUES (?, ?, ?)`,
        [id, dados.nome, dados.ativo !== false ? 1 : 0]
      );

      return id;
    } catch (erro) {
      throw erro;
    }
  }

  static async buscarPorId(id) {
    try {
      const regional = await db_get(
        'SELECT * FROM regionais WHERE id = ?',
        [id]
      );
      return regional;
    } catch (erro) {
      throw erro;
    }
  }

  static async listar() {
    try {
      const regionais = await db_all(
        'SELECT * FROM regionais ORDER BY nome ASC'
      );
      return regionais;
    } catch (erro) {
      throw erro;
    }
  }

  static async atualizar(id, dados) {
    try {
      const result = await db_run(
        `UPDATE regionais SET nome = ?, ativo = ? WHERE id = ?`,
        [dados.nome, dados.ativo !== false ? 1 : 0, id]
      );

      return result.changes;
    } catch (erro) {
      throw erro;
    }
  }

  static async deletar(id) {
    try {
      const result = await db_run(
        'DELETE FROM regionais WHERE id = ?',
        [id]
      );
      return result.changes;
    } catch (erro) {
      throw erro;
    }
  }
}

module.exports = Regional;
