// ===================================================================
// ROTAS DE RELATORIOS
// ===================================================================

const express = require('express');
const router = express.Router();
const relatoriosController = require('../controllers/relatoriosController');
const { autenticar } = require('../middleware/auth');

router.use(autenticar);

// GET /relatorios/visao-geral
router.get('/visao-geral', relatoriosController.visaoGeral);

// GET /relatorios/riscos
router.get('/riscos', relatoriosController.riscos);

// GET /relatorios/pessoas
router.get('/pessoas', relatoriosController.pessoas);

// GET /relatorios/diretorias
router.get('/diretorias', relatoriosController.diretorias);

// GET /relatorios/timeline
router.get('/timeline', relatoriosController.timeline);

module.exports = router;
