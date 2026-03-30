const express = require('express');
const router = express.Router();
const { autenticar } = require('../middleware/auth');
const contratosController = require('../controllers/contratosController');

router.use(autenticar);

// GET /api/contratos
router.get('/', contratosController.listar);

// GET /api/contratos/periodos
router.get('/periodos', contratosController.listarPeriodos);

// GET /api/contratos/filtros
router.get('/filtros', contratosController.listarFiltros);

// GET /api/contratos/analytics
router.get('/analytics', contratosController.analytics);

// POST /api/contratos/importar
router.post('/importar', contratosController.importarLote);

module.exports = router;
