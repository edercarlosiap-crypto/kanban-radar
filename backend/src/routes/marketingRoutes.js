const express = require('express');
const { autenticar } = require('../middleware/auth');
const marketingController = require('../controllers/marketingController');

const router = express.Router();

router.use(autenticar);

router.post('/importar', marketingController.importar);
router.get('/anos', marketingController.listarAnos);
router.get('/filtros', marketingController.listarFiltros);
router.get('/lancamentos', marketingController.listarLancamentos);
router.get('/analytics', marketingController.analytics);

module.exports = router;
