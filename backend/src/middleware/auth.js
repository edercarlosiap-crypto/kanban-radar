const jwt = require('jsonwebtoken');
const { db_get } = require('../config/database');

const PERFIS = {
  LEITURA: 'leitura',
  EDITOR: 'editor',
  GESTOR: 'gestor',
  ADMIN: 'admin'
};

// Middleware de autenticação
const autenticar = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ erro: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuário no banco
    const usuario = await db_get(
      'SELECT * FROM usuarios WHERE id = ?',
      [decoded.usuarioId]
    );

    if (!usuario) {
      return res.status(401).json({ erro: 'Usuário não encontrado' });
    }

    if (usuario.status !== 'ativo') {
      return res.status(403).json({ erro: 'Usuário não ativo' });
    }

    req.usuarioId = usuario.id;
    req.usuario = usuario;
    next();
  } catch (erro) {
    console.error('Erro de autenticação:', erro);
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
};

// Middleware para gestor ou superior
const apenasGestorOuSuperior = (req, res, next) => {
  if (!['gestor', 'admin'].includes(req.usuario.role)) {
    return res.status(403).json({ erro: 'Acesso negado' });
  }
  next();
};

// Middleware apenas admin
const apenasAdmin = (req, res, next) => {
  if (req.usuario.role !== 'admin') {
    return res.status(403).json({ erro: 'Acesso negado' });
  }
  next();
};

// Gerar token JWT
const gerarToken = (usuarioId) => {
  return jwt.sign(
    { usuarioId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = {
  autenticar,
  apenasGestorOuSuperior,
  apenasAdmin,
  gerarToken,
  PERFIS
};
