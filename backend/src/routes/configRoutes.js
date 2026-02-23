// ===================================================================
// ROTAS PUBLICAS DE CONFIGURACAO
// ===================================================================

const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

// GET /config/logo
router.get('/logo', configController.obterLogo);

// GET /config/radar-opcoes
router.get('/radar-opcoes', configController.obterRadarOpcoes);

module.exports = router;
