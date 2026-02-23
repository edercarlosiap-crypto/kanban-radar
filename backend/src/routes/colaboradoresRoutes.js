const express = require('express');
const router = express.Router();
const colaboradorController = require('../controllers/colaboradorController');
const { autenticar, apenasAdmin, apenasGestorOuSuperior } = require('../middleware/auth');

// Listar colaboradores por regional
router.get('/regional/:regional_id', autenticar, colaboradorController.listarPorRegional);

// CRUD - Requer permissões especiais
router.post('/', autenticar, apenasGestorOuSuperior, colaboradorController.criar);
router.get('/', autenticar, colaboradorController.listar);
router.get('/:id', autenticar, colaboradorController.buscarPorId);
router.put('/:id', autenticar, apenasGestorOuSuperior, colaboradorController.atualizar);
router.delete('/:id', autenticar, apenasAdmin, colaboradorController.deletar);

module.exports = router;
