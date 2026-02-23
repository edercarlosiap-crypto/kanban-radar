const express = require('express');
const router = express.Router();
const { autenticar } = require('../middleware/auth');
const authController = require('../controllers/authController');

// POST /api/auth/register - Registrar novo usuário
router.post('/register', authController.registrar);

// POST /api/auth/login - Login
router.post('/login', authController.login);

// GET /api/auth/me - Obter perfil do usuário autenticado
router.get('/me', autenticar, authController.perfil);

module.exports = router;
