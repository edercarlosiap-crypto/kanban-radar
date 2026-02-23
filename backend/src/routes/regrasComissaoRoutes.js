const express = require('express');
const { autenticar } = require('../middleware/auth');
const regrasComissaoController = require('../controllers/regrasComissaoController');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(autenticar);

// GET /api/regras-comissao - Listar todas
router.get('/', regrasComissaoController.listar);

// GET /api/regras-comissao/:id - Obter uma
router.get('/:id', regrasComissaoController.obter);

// POST /api/regras-comissao - Criar nova
router.post('/', regrasComissaoController.criar);

// PUT /api/regras-comissao/:id - Atualizar
router.put('/:id', regrasComissaoController.atualizar);

// DELETE /api/regras-comissao/:id - Deletar
router.delete('/:id', regrasComissaoController.deletar);

module.exports = router;
