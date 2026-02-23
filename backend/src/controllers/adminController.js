// ===================================================================
// CONTROLADOR ADMINISTRATIVO
// ===================================================================

const fs = require('fs');
const path = require('path');
const Usuario = require('../models/Usuario');
const Log = require('../models/Log');
const { db_run } = require('../config/database');
const { obterRadarOpcoes, salvarRadarOpcoes } = require('../utils/radarOpcoes');
const registrarLog = require('../utils/registrarLog');
const { invalidateAuthCacheForUser } = require('../middleware/auth');

const PERFIS_VALIDOS = ['leitura', 'editor', 'gestor', 'admin'];

// GET /admin/usuarios - Lista todos os usuarios
exports.listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.listarTodos();
    return res.status(200).json({ usuarios });
  } catch (erro) {
    console.error('Erro ao listar usuarios:', erro);
    return res.status(500).json({ erro: 'Erro ao listar usuarios' });
  }
};

// PUT /admin/usuarios/:id/aprovar - Aprova usuario
exports.aprovarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.buscarPorId(id);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuario nao encontrado' });
    }

    await Usuario.atualizarStatus(id, 'aprovado');
    invalidateAuthCacheForUser(id);
    await registrarLog(req.usuario?.email || req.usuario?.nome, 'APROVAR_USUARIO', id);

    return res.status(200).json({
      mensagem: 'Usuario aprovado com sucesso'
    });
  } catch (erro) {
    console.error('Erro ao aprovar usuario:', erro);
    return res.status(500).json({ erro: 'Erro ao aprovar usuario' });
  }
};

// PUT /admin/usuarios/:id/perfil - Atualiza perfil
exports.atualizarPerfil = async (req, res) => {
  try {
    const { id } = req.params;
    const { perfil } = req.body;

    if (!PERFIS_VALIDOS.includes(perfil)) {
      return res.status(400).json({ erro: 'Perfil invalido' });
    }

    const usuario = await Usuario.buscarPorId(id);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuario nao encontrado' });
    }

    await Usuario.atualizarPerfil(id, perfil);
    invalidateAuthCacheForUser(id);
    await registrarLog(req.usuario?.email || req.usuario?.nome, 'ALTERAR_PERFIL_USUARIO', id);

    return res.status(200).json({
      mensagem: 'Perfil atualizado com sucesso'
    });
  } catch (erro) {
    console.error('Erro ao atualizar perfil:', erro);
    return res.status(500).json({ erro: 'Erro ao atualizar perfil' });
  }
};

// PUT /admin/usuarios/:id/desativar - Desativa usuario
exports.desativarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.buscarPorId(id);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuario nao encontrado' });
    }

    await Usuario.atualizarStatus(id, 'desativado');
    invalidateAuthCacheForUser(id);

    return res.status(200).json({
      mensagem: 'Usuario desativado com sucesso'
    });
  } catch (erro) {
    console.error('Erro ao desativar usuario:', erro);
    return res.status(500).json({ erro: 'Erro ao desativar usuario' });
  }
};

// POST /admin/logo - Upload de logo
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.files || !req.files.logo) {
      return res.status(400).json({ erro: 'Arquivo de logo nao enviado' });
    }

    const arquivo = req.files.logo;
    const extensoesPermitidas = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(arquivo.name).toLowerCase();

    if (!extensoesPermitidas.includes(ext)) {
      return res.status(400).json({ erro: 'Formato de logo invalido' });
    }

    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const destino = path.join(uploadsDir, 'logo.png');
    await arquivo.mv(destino);

    await db_run('INSERT OR IGNORE INTO configuracoes (id) VALUES (1)');
    await db_run('UPDATE configuracoes SET logo = ? WHERE id = 1', ['uploads/logo.png']);

    return res.status(200).json({ mensagem: 'Logo atualizado com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar logo:', erro);
    return res.status(500).json({ erro: 'Erro ao atualizar logo' });
  }
};

// GET /admin/radar-opcoes - Retorna opcoes configuraveis do radar
exports.obterRadarOpcoes = async (req, res) => {
  try {
    const opcoes = await obterRadarOpcoes();
    return res.status(200).json(opcoes);
  } catch (erro) {
    console.error('Erro ao obter opcoes do radar:', erro);
    return res.status(500).json({ erro: 'Erro ao obter opcoes do radar' });
  }
};

// PUT /admin/radar-opcoes - Atualiza opcoes configuraveis do radar
exports.atualizarRadarOpcoes = async (req, res) => {
  try {
    const opcoes = await salvarRadarOpcoes(req.body || {});
    await registrarLog(req.usuario?.email || req.usuario?.nome, 'ATUALIZAR_OPCOES_RADAR', 'configuracoes');
    return res.status(200).json({ mensagem: 'Opcoes atualizadas com sucesso', opcoes });
  } catch (erro) {
    console.error('Erro ao atualizar opcoes do radar:', erro);
    return res.status(500).json({ erro: 'Erro ao atualizar opcoes do radar' });
  }
};

// GET /admin/logs - Lista logs
exports.listarLogs = async (req, res) => {
  try {
    const logs = await Log.listarTodos();
    return res.status(200).json({ logs });
  } catch (erro) {
    console.error('Erro ao listar logs:', erro);
    return res.status(500).json({ erro: 'Erro ao listar logs' });
  }
};
