const express = require('express');
const router = express.Router();
const { autenticar, apenasAdmin } = require('../middleware/auth');
const regionaisController = require('../controllers/regionaisController');

// Todas as rotas exigem autenticação
router.use(autenticar);

// GET /api/regionais - Listar todas
router.get('/', regionaisController.listar);

// GET /api/regionais/:id - Buscar por ID
router.get('/:id', regionaisController.buscar);

// POST /api/regionais - Criar nova
router.post('/', apenasAdmin, regionaisController.criar);

// PUT /api/regionais/:id - Atualizar
router.put('/:id', apenasAdmin, regionaisController.atualizar);

// DELETE /api/regionais/:id - Deletar
router.delete('/:id', apenasAdmin, regionaisController.deletar);

module.exports = router;
