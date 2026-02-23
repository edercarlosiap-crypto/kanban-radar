const { db_run, db_get, db_all } = require('../config/database');

class Funcao {
  static async criar(funcao) {
    try {
      const result = await db_run(
        `INSERT INTO funcoes (id, nome, eligivel_comissionamento, status, data_criacao)
         VALUES (?, ?, ?, ?, ?)`,
        [
          funcao.id,
          funcao.nome,
          funcao.eligivel_comissionamento ? 1 : 0,
          funcao.status || 'ativa',
          new Date().toISOString()
        ]
      );
      return { id: funcao.id };
    } catch (err) {
      throw err;
    }
  }

  static async buscarPorId(id) {
    try {
      const row = await db_get(
        `SELECT * FROM funcoes WHERE id = ?`,
        [id]
      );
      return row;
    } catch (err) {
      throw err;
    }
  }

  static async listar() {
    try {
      const rows = await db_all(
        `SELECT id, nome, eligivel_comissionamento, status, data_criacao
         FROM funcoes ORDER BY nome`,
        []
      );
      return rows || [];
    } catch (err) {
      throw err;
    }
  }

  static async listarElegíveis() {
    try {
      const rows = await db_all(
        `SELECT id, nome FROM funcoes WHERE eligivel_comissionamento = 1 AND status = 'ativa' ORDER BY nome`,
        []
      );
      return rows || [];
    } catch (err) {
      throw err;
    }
  }

  static async atualizar(id, funcao) {
    try {
      const result = await db_run(
        `UPDATE funcoes SET nome = ?, eligivel_comissionamento = ?, status = ? WHERE id = ?`,
        [
          funcao.nome,
          funcao.eligivel_comissionamento ? 1 : 0,
          funcao.status || 'ativa',
          id
        ]
      );
      return { changes: result.changes };
    } catch (err) {
      throw err;
    }
  }

  static async deletar(id) {
    try {
      const result = await db_run(
        `DELETE FROM funcoes WHERE id = ?`,
        [id]
      );
      return { changes: result.changes };
    } catch (err) {
      throw err;
    }
  }
}

module.exports = Funcao;
