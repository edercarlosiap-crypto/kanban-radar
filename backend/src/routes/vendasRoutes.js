const express = require('express');
const router = express.Router();
const { autenticar, apenasGestorOuSuperior } = require('../middleware/auth');
const vendasController = require('../controllers/vendasController');

// Todas as rotas exigem autenticação
router.use(autenticar);

// GET /api/vendas - Listar todas
router.get('/', vendasController.listar);

// GET /api/vendas/:id - Buscar por ID
router.get('/:id', vendasController.buscar);

// GET /api/vendas/usuario/:usuarioId - Listar por usuário
router.get('/usuario/:usuarioId', vendasController.porUsuario);

// GET /api/vendas/regional/:regionalId - Listar por regional
router.get('/regional/:regionalId', vendasController.porRegional);

// POST /api/vendas - Criar nova
router.post('/', vendasController.criar);

// PUT /api/vendas/:id - Atualizar
router.put('/:id', vendasController.atualizar);

// DELETE /api/vendas/:id - Deletar
router.delete('/:id', apenasGestorOuSuperior, vendasController.deletar);

module.exports = router;
