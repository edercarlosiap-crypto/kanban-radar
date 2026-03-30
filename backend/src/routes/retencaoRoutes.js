const express = require('express');
const router = express.Router();
const { autenticar } = require('../middleware/auth');
const retencaoController = require('../controllers/retencaoController');

router.use(autenticar);

// GET /api/retencao
router.get('/', retencaoController.listar);

// GET /api/retencao/periodos
router.get('/periodos', retencaoController.listarPeriodos);

// GET /api/retencao/analytics
router.get('/analytics', retencaoController.analytics);

// POST /api/retencao/importar
router.post('/importar', retencaoController.importarLote);

// POST /api/retencao/importar-url
router.post('/importar-url', retencaoController.importarPorUrl);

module.exports = router;
