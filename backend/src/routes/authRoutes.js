// ===================================================================
// ROTAS DE AUTENTICAÇÃO
// ===================================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { autenticar } = require('../middleware/auth');

// POST /auth/register - Registra novo usuário
router.post('/register', authController.registrar);

// POST /auth/login - Faz login
router.post('/login', authController.login);

// GET /auth/me - Retorna dados do usuário logado (protegida)
router.get('/me', autenticar, authController.obterUsuario);

module.exports = router;
