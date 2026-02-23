// ===================================================================
// MODELO DE USUÁRIOS
// ===================================================================
// Definições e funções para gerenciar usuários no banco de dados

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db_run, db_get, db_all } = require('../config/database');

class Usuario {
  // Conta usuarios cadastrados
  static async contarUsuarios() {
    try {
      const resultado = await db_get('SELECT COUNT(*) as total FROM usuarios', []);
      return resultado?.total || 0;
    } catch (erro) {
      throw erro;
    }
  }

  // Cria usuario com status e perfil especificos
  static async criarComStatusPerfil(nome, email, senha, status, perfil) {
    try {
      const id = uuidv4();
      const senhaHash = await bcrypt.hash(senha, 10);

      await db_run(
        `INSERT INTO usuarios (id, nome, email, senha, status, perfil) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, nome, email, senhaHash, status, perfil]
      );

      return id;
    } catch (erro) {
      throw erro;
    }
  }

  // Cria um novo usuário com senha criptografada
  static async criar(nome, email, senha) {
    try {
      return await Usuario.criarComStatusPerfil(nome, email, senha, 'pendente', 'leitura');
    } catch (erro) {
      throw erro;
    }
  }

  // Busca usuário pelo email
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

  // Verifica a senha - compara hash
  static async verificarSenha(senhaFornecida, senhaHash) {
    try {
      const valido = await bcrypt.compare(senhaFornecida, senhaHash);
      return valido;
    } catch (erro) {
      throw erro;
    }
  }

  // Gera token JWT para login
  static gerarToken(usuarioId, email, nome) {
    const token = jwt.sign(
      {
        usuarioId,
        email,
        nome
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Token válido por 7 dias
    );
    return token;
  }

  // Busca usuário por ID
  static async buscarPorId(id) {
    try {
      const usuario = await db_get(
        'SELECT id, nome, email, perfil, status, dataCriacao FROM usuarios WHERE id = ?',
        [id]
      );
      return usuario;
    } catch (erro) {
      throw erro;
    }
  }

  // Lista todos os usuários (apenas admin)
  static async listarTodos() {
    try {
      const usuarios = await db_all(
        'SELECT id, nome, email, perfil, status, dataCriacao FROM usuarios ORDER BY dataCriacao DESC'
      );
      return usuarios;
    } catch (erro) {
      throw erro;
    }
  }

  // Atualiza status do usuario
  static async atualizarStatus(id, status) {
    try {
      await db_run(
        'UPDATE usuarios SET status = ? WHERE id = ?',
        [status, id]
      );
    } catch (erro) {
      throw erro;
    }
  }

  // Atualiza perfil do usuario
  static async atualizarPerfil(id, perfil) {
    try {
      await db_run(
        'UPDATE usuarios SET perfil = ? WHERE id = ?',
        [perfil, id]
      );
    } catch (erro) {
      throw erro;
    }
  }
}

module.exports = Usuario;
