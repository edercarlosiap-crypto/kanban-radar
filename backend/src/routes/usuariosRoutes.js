const express = require('express');
const router = express.Router();
const { autenticar, apenasAdmin } = require('../middleware/auth');
const usuariosController = require('../controllers/usuariosController');

// Todas as rotas exigem autenticação
router.use(autenticar);

// GET /api/usuarios - Listar todos
router.get('/', usuariosController.listar);

// GET /api/usuarios/:id - Buscar por ID
router.get('/:id', usuariosController.buscar);

// PUT /api/usuarios/:id - Atualizar
router.put('/:id', apenasAdmin, usuariosController.atualizar);

// DELETE /api/usuarios/:id - Deletar
router.delete('/:id', apenasAdmin, usuariosController.deletar);

module.exports = router;
