const express = require('express');
const router = express.Router();
const { autenticar, apenasAdmin } = require('../middleware/auth');
const regrasComissaoController = require('../controllers/regrasComissaoController');

// Todas as rotas exigem autenticacao
router.use(autenticar);

// Parametros de lideranca por periodo
router.get('/lideranca', regrasComissaoController.obterRegraLideranca);
router.put('/lideranca', apenasAdmin, regrasComissaoController.salvarRegraLideranca);

// Regras por regional
router.get('/regional/:regionalId', regrasComissaoController.porRegional);

// Listagem geral
router.get('/', regrasComissaoController.listar);

// CRUD por id
router.get('/:id', regrasComissaoController.buscar);
router.post('/', apenasAdmin, regrasComissaoController.criar);
router.put('/:id', apenasAdmin, regrasComissaoController.atualizar);
router.delete('/:id', apenasAdmin, regrasComissaoController.deletar);

module.exports = router;
