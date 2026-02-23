const express = require('express');
const router = express.Router();
const { autenticar, apenasAdmin }  = require('../middleware/auth');
const regrasComissaoController = require('../controllers/regrasComissaoController');

// Todas as rotas exigem autenticação
router.use(autenticar);

// GET /api/regras-comissao - Listar todas
router.get('/', regrasComissaoController.listar);

// GET /api/regras-comissao/:id - Buscar por ID
router.get('/:id', regrasComissaoController.buscar);

// GET /api/regras-comissao/regional/:regionalId - Listar por regional
router.get('/regional/:regionalId', regrasComissaoController.porRegional);

// POST /api/regras-comissao - Criar nova
router.post('/', apenasAdmin, regrasComissaoController.criar);

// PUT /api/regras-comissao/:id - Atualizar
router.put('/:id', apenasAdmin, regrasComissaoController.atualizar);

// DELETE /api/regras-comissao/:id - Deletar
router.delete('/:id', apenasAdmin, regrasComissaoController.deletar);

module.exports = router;
