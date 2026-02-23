const { db_run, db_get, db_all } = require('../config/database');

class Colaborador {
  static async criar(colaborador) {
    try {
      const result = await db_run(
        `INSERT INTO colaboradores (id, nome, regional_id, funcao_id, status, data_criacao)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          colaborador.id,
          colaborador.nome,
          colaborador.regional_id,
          colaborador.funcao_id,
          colaborador.status || 'ativo',
          new Date().toISOString()
        ]
      );
      return { id: colaborador.id };
    } catch (err) {
      throw err;
    }
  }

  static async buscarPorId(id) {
    try {
      const row = await db_get(
        `SELECT c.*, r.nome as regional_nome, f.nome as funcao_nome
         FROM colaboradores c
         LEFT JOIN regionais r ON c.regional_id = r.id
         LEFT JOIN funcoes f ON c.funcao_id = f.id
         WHERE c.id = ?`,
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
        `SELECT c.id, c.nome, c.regional_id, c.funcao_id, c.status,
                r.nome as regional_nome, f.nome as funcao_nome
         FROM colaboradores c
         LEFT JOIN regionais r ON c.regional_id = r.id
         LEFT JOIN funcoes f ON c.funcao_id = f.id
         ORDER BY c.nome`,
        []
      );
      return rows || [];
    } catch (err) {
      throw err;
    }
  }

  static async listarPorRegional(regional_id) {
    try {
      const rows = await db_all(
        `SELECT c.id, c.nome, c.funcao_id, c.status, f.nome as funcao_nome
         FROM colaboradores c
         LEFT JOIN funcoes f ON c.funcao_id = f.id
         WHERE c.regional_id = ? AND c.status = 'ativo'
         ORDER BY c.nome`,
        [regional_id]
      );
      return rows || [];
    } catch (err) {
      throw err;
    }
  }

  static async atualizar(id, colaborador) {
    try {
      const result = await db_run(
        `UPDATE colaboradores SET nome = ?, regional_id = ?, funcao_id = ?, status = ? WHERE id = ?`,
        [
          colaborador.nome,
          colaborador.regional_id,
          colaborador.funcao_id,
          colaborador.status || 'ativo',
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
        `DELETE FROM colaboradores WHERE id = ?`,
        [id]
      );
      return { changes: result.changes };
    } catch (err) {
      throw err;
    }
  }
}

module.exports = Colaborador;
