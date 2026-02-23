const express = require('express');
const router = express.Router();
const comissionamentoController = require('../controllers/comissionamentoController');
const { autenticar } = require('../middleware/auth');

// Aplica autenticação
router.use(autenticar);

// GET /api/comissionamento/consolidado?periodo=Jan/25
router.get('/consolidado', comissionamentoController.listarConsolidado);

// GET /api/comissionamento/vendedores?periodo=Jan/25&regionalId=uuid
// IMPORTANTE: Rotas específicas devem vir antes das genéricas
router.get('/vendedores', comissionamentoController.listarVendedores);

// GET /api/comissionamento?periodo=Jan/25&regionalId=uuid
router.get('/', comissionamentoController.calcularComissionamento);

module.exports = router;
