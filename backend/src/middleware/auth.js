// ===================================================================
// MIDDLEWARE DE AUTENTICACAO JWT
// ===================================================================
// Valida tokens JWT e protege as rotas do sistema

const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

const authCache = new Map();
const userTokenIndex = new Map();
const AUTH_CACHE_TTL_MS = Number(process.env.AUTH_CACHE_TTL_MS || 60000);

const registerTokenForUser = (userId, token) => {
  if (!userId || !token) return;
  const tokens = userTokenIndex.get(userId) || new Set();
  tokens.add(token);
  userTokenIndex.set(userId, tokens);
};

const removeTokenFromIndexes = (userId, token) => {
  if (!userId || !token) return;
  const tokens = userTokenIndex.get(userId);
  if (!tokens) return;
  tokens.delete(token);
  if (tokens.size === 0) {
    userTokenIndex.delete(userId);
  } else {
    userTokenIndex.set(userId, tokens);
  }
};

const setAuthCache = (token, usuario) => {
  const expiresAt = Date.now() + AUTH_CACHE_TTL_MS;
  authCache.set(token, { usuario, expiresAt });
  registerTokenForUser(usuario.id, token);
};

const getAuthCache = (token) => {
  const cached = authCache.get(token);
  if (!cached) return null;

  if (cached.expiresAt < Date.now()) {
    authCache.delete(token);
    removeTokenFromIndexes(cached.usuario?.id, token);
    return null;
  }

  return cached.usuario;
};

const invalidateAuthCacheForUser = (userId) => {
  const tokens = userTokenIndex.get(userId);
  if (!tokens) return;

  for (const token of tokens) {
    authCache.delete(token);
  }
  userTokenIndex.delete(userId);
};

// Middleware para verificar se o usuario esta autenticado
const autenticar = async (req, res, next) => {
  try {
    // Pega o token do header Authorization
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        erro: 'Token nao fornecido'
      });
    }

    // Valida o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let usuario = getAuthCache(token);
    if (!usuario) {
      usuario = await Usuario.buscarPorId(decoded.usuarioId);
      if (usuario) {
        setAuthCache(token, usuario);
      }
    }

    if (!usuario) {
      return res.status(401).json({
        erro: 'Usuario nao encontrado'
      });
    }

    if (usuario.status !== 'aprovado') {
      const mensagem = usuario.status === 'pendente'
        ? 'Aguardando aprovacao do administrador'
        : 'Usuario desativado';

      return res.status(403).json({
        erro: mensagem
      });
    }

    // Adiciona os dados do usuario ao request
    req.usuarioId = usuario.id;
    req.usuario = usuario;

    next();
  } catch (erro) {
    return res.status(401).json({
      erro: 'Token invalido ou expirado'
    });
  }
};

module.exports = {
  autenticar,
  invalidateAuthCacheForUser,
};
