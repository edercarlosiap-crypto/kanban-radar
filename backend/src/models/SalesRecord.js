const { db_run, db_get, db_all } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class SalesRecord {
  static async criar(dados) {
    try {
      const id = uuidv4();

      await db_run(
        `INSERT INTO vendas (id, usuarioId, regionalId, valor, tipo, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, dados.usuarioId, dados.regionalId, dados.valor, dados.tipo, 'pendente']
      );

      return id;
    } catch (erro) {
      throw erro;
    }
  }

  static async buscarPorId(id) {
    try {
      const venda = await db_get(
        'SELECT * FROM vendas WHERE id = ?',
        [id]
      );
      return venda;
    } catch (erro) {
      throw erro;
    }
  }

  static async listar() {
    try {
      const vendas = await db_all(
        'SELECT * FROM vendas ORDER BY dataCriacao DESC'
      );
      return vendas;
    } catch (erro) {
      throw erro;
    }
  }

  static async listarPorUsuario(usuarioId) {
    try {
      const vendas = await db_all(
        'SELECT * FROM vendas WHERE usuarioId = ? ORDER BY dataCriacao DESC',
        [usuarioId]
      );
      return vendas;
    } catch (erro) {
      throw erro;
    }
  }

  static async listarPorRegional(regionalId) {
    try {
      const vendas = await db_all(
        'SELECT * FROM vendas WHERE regionalId = ? ORDER BY dataCriacao DESC',
        [regionalId]
      );
      return vendas;
    } catch (erro) {
      throw erro;
    }
  }

  static async atualizar(id, dados) {
    try {
      const result = await db_run(
        `UPDATE vendas SET valor = ?, tipo = ?, status = ? WHERE id = ?`,
        [dados.valor, dados.tipo, dados.status, id]
      );

      return result.changes;
    } catch (erro) {
      throw erro;
    }
  }

  static async deletar(id) {
    try {
      const result = await db_run(
        'DELETE FROM vendas WHERE id = ?',
        [id]
      );
      return result.changes;
    } catch (erro) {
      throw erro;
    }
  }
}

module.exports = SalesRecord;
