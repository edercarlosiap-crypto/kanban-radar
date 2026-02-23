const express = require('express');
const router = express.Router();
const funcaoController = require('../controllers/funcaoController');
const { autenticar, apenasAdmin, apenasGestorOuSuperior } = require('../middleware/auth');

// Listar funções elegíveis (público dentro da API)
router.get('/elegiveis', autenticar, funcaoController.listarElegíveis);

// CRUD - Requer permissões especiais
router.post('/', autenticar, apenasAdmin, funcaoController.criar);
router.get('/', autenticar, funcaoController.listar);
router.get('/:id', autenticar, funcaoController.buscarPorId);
router.put('/:id', autenticar, apenasAdmin, funcaoController.atualizar);
router.delete('/:id', autenticar, apenasAdmin, funcaoController.deletar);

module.exports = router;
