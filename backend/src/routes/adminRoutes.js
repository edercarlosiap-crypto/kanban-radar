// ===================================================================
// ROTAS ADMINISTRATIVAS
// ===================================================================

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { autenticar } = require('../middleware/auth');
const { apenasAdmin } = require('../middleware/permissao');

router.use(autenticar);
router.use(apenasAdmin);

// GET /admin/usuarios
router.get('/usuarios', adminController.listarUsuarios);

// PUT /admin/usuarios/:id/aprovar
router.put('/usuarios/:id/aprovar', adminController.aprovarUsuario);

// PUT /admin/usuarios/:id/perfil
router.put('/usuarios/:id/perfil', adminController.atualizarPerfil);

// PUT /admin/usuarios/:id/desativar
router.put('/usuarios/:id/desativar', adminController.desativarUsuario);

// POST /admin/logo
router.post('/logo', adminController.uploadLogo);

// GET /admin/radar-opcoes
router.get('/radar-opcoes', adminController.obterRadarOpcoes);

// PUT /admin/radar-opcoes
router.put('/radar-opcoes', adminController.atualizarRadarOpcoes);

// GET /admin/logs
router.get('/logs', adminController.listarLogs);

module.exports = router;
