const { db_run, db_get, db_all } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class Usuario {
  static async criar(dados) {
    try {
      const id = uuidv4();
      const senhaHash = await bcrypt.hash(dados.senha, 10);

      await db_run(
        `INSERT INTO usuarios (id, nome, email, senha, role, regionalId, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, dados.nome, dados.email, senhaHash, dados.role || 'leitura', dados.regionalId || null, 'ativo']
      );

      return id;
    } catch (erro) {
      throw erro;
    }
  }

  static async buscarPorId(id) {
    try {
      const usuario = await db_get(
        'SELECT id, nome, email, role, regionalId, status FROM usuarios WHERE id = ?',
        [id]
      );
      return usuario;
    } catch (erro) {
      throw erro;
    }
  }

  static async buscarPorEmail(email) {
    try {
      const usuario = await db_get(
        'SELECT * FROM usuarios WHERE email = ?',
        [email]
      );
      return usuario;
    } catch (erro) {
      throw erro;
    }
  }

  static async listar() {
    try {
      const usuarios = await db_all(
        'SELECT id, nome, email, role, regionalId, status, dataCriacao FROM usuarios ORDER BY dataCriacao DESC'
      );
      return usuarios;
    } catch (erro) {
      throw erro;
    }
  }

  static async atualizar(id, dados) {
    try {
      const campos = [];
      const valores = [];

      if (dados.nome !== undefined) {
        campos.push('nome = ?');
        valores.push(dados.nome);
      }
      if (dados.role !== undefined) {
        campos.push('role = ?');
        valores.push(dados.role);
      }
      if (dados.regionalId !== undefined) {
        campos.push('regionalId = ?');
        valores.push(dados.regionalId);
      }
      if (dados.status !== undefined) {
        campos.push('status = ?');
        valores.push(dados.status);
      }

      if (campos.length === 0) return 0;

      valores.push(id);

      const result = await db_run(
        `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`,
        valores
      );

      return result.changes;
    } catch (erro) {
      throw erro;
    }
  }

  static async deletar(id) {
    try {
      const result = await db_run(
        'DELETE FROM usuarios WHERE id = ?',
        [id]
      );
      return result.changes;
    } catch (erro) {
      throw erro;
    }
  }

  static async verificarSenha(senhaPlana, senhaHash) {
    return bcrypt.compare(senhaPlana, senhaHash);
  }
}

module.exports = Usuario;
