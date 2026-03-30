const express = require('express');
const router = express.Router();
const comissionamentoController = require('../controllers/comissionamentoController');
const { autenticar } = require('../middleware/auth');

// Aplica autenticacao
router.use(autenticar);

// GET /api/comissionamento/consolidado?periodo=Jan/25
router.get('/consolidado', comissionamentoController.listarConsolidado);

// GET /api/comissionamento/vendedores?periodo=Jan/25&regionalId=uuid
// IMPORTANTE: Rotas especificas devem vir antes das genericas
router.get('/vendedores', comissionamentoController.listarVendedores);

// GET /api/comissionamento/liderancas?periodo=Jan/25
router.get('/liderancas', comissionamentoController.listarLiderancas);

// GET /api/comissionamento/relatorio-rh?periodo=Jan/25&regionalId=uuid(opcional)
router.get('/relatorio-rh', comissionamentoController.listarRelatorioRH);

// GET /api/comissionamento/dashboard-variavel?periodoInicio=Dez/25&periodoFim=Fev/26
router.get('/dashboard-variavel', comissionamentoController.listarDashboardVariavel);
router.post('/simulador', comissionamentoController.simularRemuneracaoVendedor);

// GET /api/comissionamento?periodo=Jan/25&regionalId=uuid
router.get('/', comissionamentoController.calcularComissionamento);

module.exports = router;
